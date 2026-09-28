import { generateText } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { NextResponse } from "next/server";
import { getEducationUser } from "../../../../../lib/education-session";
import { getEducationSql } from "../../../../../lib/db";
import { ensureEducationAiMaterialSchema } from "../../../../../lib/education-ai-materials";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

const MODEL = process.env.EDUCATION_AI_MODEL || "openai/gpt-5.4-mini";

function terms(text) {
  return [...new Set(String(text || "").toLowerCase().match(/[a-z0-9]{3,}/g) || [])].slice(0, 50);
}

function scoreText(text, queryTerms) {
  const haystack = String(text || "").toLowerCase();
  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function extractJson(text) {
  const raw = String(text || "").trim().replace(/^```json\s*/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  try { return JSON.parse(raw); } catch {}
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)); } catch {}
  }
  return null;
}

function cleanSourceNumbers(value, maxSource) {
  if (!Array.isArray(value)) return null;
  const numbers = [...new Set(value.map(Number).filter((number) => Number.isInteger(number) && number >= 1 && number <= maxSource))];
  return numbers.length ? numbers : null;
}

function validatePracticeSet(parsed, mode, count, maxSource) {
  if (!parsed || !Array.isArray(parsed.questions) || parsed.questions.length !== count)
    return { ok: false, error: `AI Tutor must return exactly ${count} questions.` };
  const normalized = [];
  for (let index = 0; index < parsed.questions.length; index++) {
    const raw = parsed.questions[index] || {};
    const question = String(raw.question || "").trim();
    const sourceNumbers = cleanSourceNumbers(raw.sourceNumbers, maxSource);
    if (!question) return { ok: false, error: `Question ${index + 1} is blank.` };
    if (!sourceNumbers) return { ok: false, error: `Question ${index + 1} has no valid approved source reference.` };
    if (mode === "mcq") {
      if (!Array.isArray(raw.options) || raw.options.length !== 4)
        return { ok: false, error: `Question ${index + 1} must contain exactly four options.` };
      const options = raw.options.map((option) => String(option || "").trim());
      if (options.some((option) => !option)) return { ok: false, error: `Question ${index + 1} contains a blank option.` };
      if (new Set(options.map((option) => option.toLowerCase())).size !== 4)
        return { ok: false, error: `Question ${index + 1} contains duplicate options.` };
      if (!Number.isInteger(raw.correctIndex) || raw.correctIndex < 0 || raw.correctIndex > 3)
        return { ok: false, error: `Question ${index + 1} has an invalid correct answer index.` };
      const explanation = String(raw.explanation || "").trim();
      if (!explanation) return { ok: false, error: `Question ${index + 1} has no explanation.` };
      normalized.push({ id: index + 1, question, options, correctIndex: raw.correctIndex, explanation, sourceNumbers });
      continue;
    }
    const answerGuide = String(raw.answerGuide || "").trim();
    if (!answerGuide) return { ok: false, error: `Question ${index + 1} has no answer guide.` };
    normalized.push({ id: index + 1, question, answerGuide, sourceNumbers });
  }
  return { ok: true, questions: normalized };
}

async function loadApprovedMaterials(sql, userId, offeringId, focus) {
  const rows = await sql`
    select m.id,m.offering_id,m.title,m.material_type,m.description,c.code,c.title as course_title,
      (select count(distinct term)::int
       from regexp_split_to_table(lower(${focus}), '[^a-z0-9]+') as term
       where length(term)>=3 and (
         lower(coalesce(m.title,'')||' '||coalesce(m.description,'')) like '%'||term||'%'
         or exists (
           select 1 from edu_learning_material_chunks search_chunk
           where search_chunk.material_id=m.id and lower(search_chunk.content) like '%'||term||'%'
         )
       )) as relevance
    from edu_enrolments e
    join edu_course_offerings o on o.id=e.offering_id
    join edu_learning_materials m on m.offering_id=o.id
    join edu_courses c on c.id=o.course_id
    where e.student_user_id=${userId} and e.status='active'
      and m.published_at is not null and m.is_ai_approved=true
      and m.ai_processing_status='ready'
      and exists (select 1 from edu_learning_material_chunks ready_chunk where ready_chunk.material_id=m.id)
      and (${offeringId}::bigint is null or o.id=${offeringId})
    order by relevance desc,m.id desc
    limit 200`;
  return rows.filter((row) => Number(row.relevance) > 0).slice(0, 5);
}

function citationsFor(rows) {
  return rows.map((row) => ({ id: row.id, title: row.title, courseCode: row.code, courseTitle: row.course_title, type: row.material_type }));
}

async function contextFor(sql, rows, focus) {
  const queryTerms = terms(focus);
  const parts = [];
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const chunks = await sql`select chunk_index,content from edu_learning_material_chunks where material_id=${row.id} order by chunk_index limit 500`;
    const excerpts = chunks.map((chunk) => ({ ...chunk, relevance: scoreText(chunk.content, queryTerms) }))
      .sort((a, b) => b.relevance - a.relevance || a.chunk_index - b.chunk_index)
      .slice(0, 3).map((chunk) => chunk.content);
    parts.push(`[SOURCE ${index + 1}] ${row.code} — ${row.title}\n${excerpts.join("\n\n[Relevant section]\n")}`);
  }
  return parts.join("\n\n");
}

function difficultyInstruction(level) {
  if (level === "foundation") return "FOUNDATION difficulty: test essential recall, definitions, core principles, and straightforward application. Avoid unnecessary traps or obscure distinctions.";
  if (level === "challenge") return "CHALLENGE difficulty: use higher-order application, integration, discriminating distractors, and multi-step reasoning, but every answer must remain directly supported by the approved material.";
  return "STANDARD difficulty: use a balanced mix of recall, understanding, and clinically or academically relevant application suitable for normal course revision.";
}

function gatewayStatus(error) {
  return Number(error?.statusCode || error?.status || error?.response?.status || 0);
}

async function callGateway(messages, { temperature = 0.1, maxOutputTokens = 5000 } = {}) {
  try {
    const result = await generateText({ model: gateway(MODEL), messages, temperature, maxOutputTokens, maxRetries: 2 });
    return { ready: true, text: String(result.text || "").trim() };
  } catch (error) {
    const status = gatewayStatus(error);
    if ([401, 402, 403].includes(status)) {
      console.error("AI Tutor Gateway is not available for this deployment:", status);
      return { ready: false };
    }
    throw error;
  }
}

export async function GET() {
  const access = await getEducationUser("student");
  if (!access.ok) return NextResponse.json({ ok: false, error: "Student access required." }, { status: 401 });
  try {
    const sql = getEducationSql();
    await ensureEducationAiMaterialSchema(sql);
    const [courses, sources] = await Promise.all([
      sql`
        select o.id,c.code,c.title as course_title,cl.name as class_name,
          count(m.id) filter (where m.published_at is not null and m.is_ai_approved=true
            and m.ai_processing_status='ready'
            and exists (select 1 from edu_learning_material_chunks ready_chunk where ready_chunk.material_id=m.id))::int as source_count
        from edu_enrolments e
        join edu_course_offerings o on o.id=e.offering_id
        join edu_courses c on c.id=o.course_id
        join edu_classes cl on cl.id=o.class_id
        left join edu_learning_materials m on m.offering_id=o.id
        where e.student_user_id=${access.user.id} and e.status='active'
        group by o.id,c.code,c.title,cl.name order by c.code,c.title`,
      sql`
        select m.id,m.offering_id,m.title,m.material_type,m.description,c.code,c.title as course_title
        from edu_enrolments e
        join edu_course_offerings o on o.id=e.offering_id
        join edu_learning_materials m on m.offering_id=o.id
        join edu_courses c on c.id=o.course_id
        where e.student_user_id=${access.user.id} and e.status='active'
          and m.published_at is not null and m.is_ai_approved=true
          and m.ai_processing_status='ready'
          and exists (select 1 from edu_learning_material_chunks ready_chunk where ready_chunk.material_id=m.id)
        order by c.code,m.title limit 200`,
    ]);
    return NextResponse.json({ ok: true, courses, sources });
  } catch (error) {
    console.error("AI Tutor sources unavailable:", error);
    return NextResponse.json({ ok: false, error: "AI Tutor sources are not ready yet." }, { status: 503 });
  }
}

export async function POST(request) {
  const access = await getEducationUser("student");
  if (!access.ok) return NextResponse.json({ ok: false, error: "Student access required." }, { status: 401 });
  try {
    const body = await request.json();
    const mode = ["answer", "mcq", "written"].includes(body.mode) ? body.mode : "answer";
    const question = String(body.question || "").trim();
    const topic = String(body.topic || question).trim();
    const offeringId = body.offeringId ? Number(body.offeringId) : null;
    const allowedCounts = [5, 10, 20, 30, 50];
    const count = allowedCounts.includes(Number(body.count)) ? Number(body.count) : 5;
    const difficulty = ["foundation", "standard", "challenge"].includes(body.difficulty) ? body.difficulty : "standard";
    const focus = mode === "answer" ? question : topic;
    if (focus.length < 3 || focus.length > 1500)
      return NextResponse.json({ ok: false, error: mode === "answer" ? "Enter a question between 3 and 1500 characters." : "Enter a topic between 3 and 1500 characters." }, { status: 400 });
    if (offeringId && !Number.isInteger(offeringId)) return NextResponse.json({ ok: false, error: "Invalid course scope." }, { status: 400 });

    const sql = getEducationSql();
    await ensureEducationAiMaterialSchema(sql);
    const ranked = await loadApprovedMaterials(sql, access.user.id, offeringId, focus);
    if (!ranked.length)
      return NextResponse.json({ ok: true, supported: false, mode, answer: "I could not find enough support for that topic in your lecturer-approved course materials. Choose a topic covered by an approved, fully processed enrolled-course resource.", citations: [], questions: [] });

    const citations = citationsFor(ranked);
    const context = await contextFor(sql, ranked, focus);
    console.info("AI Tutor grounded request", { mode, studentId: access.user.id, offeringId, sourceIds: citations.map((citation) => citation.id), model: MODEL });

    if (mode === "mcq" || mode === "written") {
      const difficultyText = difficultyInstruction(difficulty);
      const format = mode === "mcq"
        ? `Return ONLY valid JSON in this exact shape: {"title":"...","questions":[{"question":"...","options":["A","B","C","D"],"correctIndex":0,"explanation":"...","sourceNumbers":[1]}]}. Create exactly ${count} single-best-answer MCQs, exactly four distinct nonblank plausible options each, correctIndex must be an integer from 0 to 3, every explanation must be nonblank and supported by the sources, every question must include at least one valid sourceNumbers value from 1 to ${citations.length}, and do not add unsupported facts.`
        : `Return ONLY valid JSON in this exact shape: {"title":"...","questions":[{"question":"...","answerGuide":"...","sourceNumbers":[1]}]}. Create exactly ${count} written/short-answer revision questions, every question and answerGuide must be nonblank, every question must include at least one valid sourceNumbers value from 1 to ${citations.length}, and all content must be supported by the sources with no unsupported facts.`;
      const result = await callGateway([
        { role: "system", content: "You are the Dropare Education assessment generator. Generate practice questions ONLY from the supplied lecturer-approved materials. Never use general knowledge to fill gaps. Questions are formative revision, not official graded assessments. Keep every item concise enough for the complete requested set to fit in one response." },
        { role: "user", content: `TOPIC OR RECENT LESSON FOCUS:\n${topic}\n\nDIFFICULTY:\n${difficultyText}\n\n${format}\n\nAPPROVED MATERIAL:\n${context}` },
      ], { temperature: 0.2, maxOutputTokens: Math.min(48000, Math.max(8000, count * 850)) });
      if (!result.ready)
        return NextResponse.json({ ok: true, supported: true, serviceReady: false, mode, difficulty, answer: "The approved material is ready, but the AI generation service is not enabled for this Preview yet.", questions: [], citations });
      const parsed = extractJson(result.text);
      const validation = validatePracticeSet(parsed, mode, count, citations.length);
      if (!validation.ok) {
        console.error("AI Tutor practice validation failed:", validation.error);
        return NextResponse.json({ ok: false, error: "AI Tutor could not format the full practice set. Please try again." }, { status: 503 });
      }
      const title = String(parsed.title || "").trim() || `${mode === "mcq" ? "MCQ" : "Written"} practice`;
      await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'ai_tutor_practice_generated','student',${access.user.id},${JSON.stringify({ mode, count, difficulty, offeringId, topic: topic.slice(0, 200), sourceIds: citations.map((citation) => citation.id) })}::jsonb)`;
      return NextResponse.json({ ok: true, supported: true, serviceReady: true, mode, difficulty, title, questions: validation.questions, citations });
    }

    const result = await callGateway([
      { role: "system", content: "You are the Dropare Education AI Tutor. Answer ONLY from the supplied lecturer-approved course material. Do not add facts from general knowledge. If the supplied text does not support an answer, say so. Cite claims using [Source 1], [Source 2], etc. Be concise, educational, and clearly distinguish learning information from patient-specific medical advice." },
      { role: "user", content: `QUESTION:\n${question}\n\nAPPROVED MATERIAL:\n${context}` },
    ]);
    if (!result.ready)
      return NextResponse.json({ ok: true, supported: true, serviceReady: false, mode, answer: "Relevant approved material was found, but the AI generation service is not enabled for this Preview yet.", citations });
    if (!result.text) return NextResponse.json({ ok: false, error: "AI Tutor returned an empty response." }, { status: 503 });
    await sql`insert into edu_audit_logs(actor_user_id,action,entity_type,entity_id,metadata) values(${access.user.id},'ai_tutor_question','student',${access.user.id},${JSON.stringify({ offeringId, sourceIds: citations.map((citation) => citation.id) })}::jsonb)`;
    return NextResponse.json({ ok: true, supported: true, serviceReady: true, mode, answer: result.text, citations });
  } catch (error) {
    console.error("AI Tutor request failed:", error);
    return NextResponse.json({ ok: false, error: "AI Tutor is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
