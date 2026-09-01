import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

function terms(text) {
  return [...new Set(String(text || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 40);
}

function scoreMaterial(material, queryTerms) {
  const haystack = `${material.title || ''} ${material.description || ''} ${material.content_text || ''}`.toLowerCase();
  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

export async function GET() {
  const access = await getEducationUser('student');
  if (!access.ok) return NextResponse.json({ ok: false, error: 'Student access required.' }, { status: 401 });
  try {
    const sql = getEducationSql();
    const sources = await sql`
      select m.id,m.offering_id,m.title,m.material_type,m.description,
             c.code,c.title as course_title
      from edu_enrolments e
      join edu_course_offerings o on o.id=e.offering_id
      join edu_learning_materials m on m.offering_id=o.id
      join edu_courses c on c.id=o.course_id
      where e.student_user_id=${access.user.id}
        and e.status='active'
        and m.published_at is not null
        and m.is_ai_approved=true
        and nullif(trim(coalesce(m.content_text,'')),'') is not null
      order by c.code,m.title
      limit 200
    `;
    return NextResponse.json({ ok: true, sources });
  } catch (error) {
    console.error('AI Tutor sources unavailable:', error);
    return NextResponse.json({ ok: false, error: 'AI Tutor sources are not ready yet.' }, { status: 503 });
  }
}

export async function POST(request) {
  const access = await getEducationUser('student');
  if (!access.ok) return NextResponse.json({ ok: false, error: 'Student access required.' }, { status: 401 });
  try {
    const body = await request.json();
    const question = String(body.question || '').trim();
    const offeringId = body.offeringId ? Number(body.offeringId) : null;
    if (question.length < 3 || question.length > 1500) return NextResponse.json({ ok: false, error: 'Enter a question between 3 and 1500 characters.' }, { status: 400 });
    if (offeringId && !Number.isInteger(offeringId)) return NextResponse.json({ ok: false, error: 'Invalid course scope.' }, { status: 400 });

    const sql = getEducationSql();
    const rows = await sql`
      select m.id,m.offering_id,m.title,m.material_type,m.description,m.content_text,
             c.code,c.title as course_title
      from edu_enrolments e
      join edu_course_offerings o on o.id=e.offering_id
      join edu_learning_materials m on m.offering_id=o.id
      join edu_courses c on c.id=o.course_id
      where e.student_user_id=${access.user.id}
        and e.status='active'
        and m.published_at is not null
        and m.is_ai_approved=true
        and nullif(trim(coalesce(m.content_text,'')),'') is not null
        and (${offeringId}::bigint is null or o.id=${offeringId})
      limit 200
    `;

    const queryTerms = terms(question);
    const ranked = rows.map(row => ({ ...row, relevance: scoreMaterial(row, queryTerms) }))
      .filter(row => row.relevance > 0)
      .sort((a,b) => b.relevance - a.relevance)
      .slice(0, 5);

    if (!ranked.length) {
      return NextResponse.json({
        ok: true,
        supported: false,
        answer: 'I could not find enough support for that question in your lecturer-approved course materials. Please choose another course scope or ask about content that has been approved for the AI Tutor.',
        citations: [],
      });
    }

    const citations = ranked.map(row => ({ id: row.id, title: row.title, courseCode: row.code, courseTitle: row.course_title, type: row.material_type }));
    const context = ranked.map((row,index) => `[SOURCE ${index + 1}] ${row.code} — ${row.title}\n${String(row.content_text).slice(0, 7000)}`).join('\n\n');

    const gatewayKey = process.env.AI_GATEWAY_API_KEY;
    if (!gatewayKey) {
      return NextResponse.json({
        ok: true,
        supported: true,
        serviceReady: false,
        answer: 'Relevant approved material was found, but the AI generation service has not been enabled for this deployment yet.',
        citations,
      });
    }

    const model = process.env.EDUCATION_AI_MODEL;
    if (!model) return NextResponse.json({ ok: false, error: 'AI model configuration is missing.' }, { status: 503 });

    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${gatewayKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        messages: [
          { role: 'system', content: 'You are the Dropare Education AI Tutor. Answer ONLY from the supplied lecturer-approved course material. Do not add facts from general knowledge. If the supplied text does not support an answer, say so. Cite claims using [Source 1], [Source 2], etc. Be concise, educational, and clearly distinguish learning information from patient-specific medical advice.' },
          { role: 'user', content: `QUESTION:\n${question}\n\nAPPROVED MATERIAL:\n${context}` },
        ],
      }),
    });
    if (!response.ok) {
      console.error('AI Gateway response:', response.status, await response.text());
      return NextResponse.json({ ok: false, error: 'AI Tutor generation is temporarily unavailable.' }, { status: 503 });
    }
    const data = await response.json();
    const answer = data?.choices?.[0]?.message?.content?.trim();
    if (!answer) return NextResponse.json({ ok: false, error: 'AI Tutor returned an empty response.' }, { status: 503 });

    await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'ai_tutor_question','student',${access.user.id},${JSON.stringify({ offeringId, sourceIds: citations.map(c=>c.id) })}::jsonb)`;
    return NextResponse.json({ ok: true, supported: true, serviceReady: true, answer, citations });
  } catch (error) {
    console.error('AI Tutor request failed:', error);
    return NextResponse.json({ ok: false, error: 'AI Tutor is temporarily unavailable.' }, { status: 503 });
  }
}
