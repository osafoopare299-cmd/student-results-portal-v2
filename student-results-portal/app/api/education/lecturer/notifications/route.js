import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';

export const dynamic='force-dynamic';
const clean=(v,max=5000)=>String(v??'').trim().slice(0,max);

export async function GET(){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const sql=getEducationSql();
    const offerings=await sql`select o.id,c.code,c.title as course_title,cl.name as class_name from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where o.lecturer_user_id=${access.user.id} order by c.code`;
    const announcements=await sql`select a.id,a.offering_id,a.title,a.body,a.published_at,a.created_at,c.code,c.title as course_title from edu_announcements a left join edu_course_offerings o on o.id=a.offering_id left join edu_courses c on c.id=o.course_id where a.author_user_id=${access.user.id} order by coalesce(a.published_at,a.created_at) desc limit 100`;
    return NextResponse.json({ok:true,offerings,announcements});
  }catch(error){console.error('Lecturer notifications unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load announcements.'},{status:503});}
}

export async function POST(request){
  const access=await getEducationUser('lecturer');
  if(!access.ok)return NextResponse.json({ok:false,error:'Lecturer access required.'},{status:401});
  try{
    const b=await request.json(),offeringId=Number(b.offeringId),title=clean(b.title,200),body=clean(b.message,5000),sql=getEducationSql();
    if(!title||!body||!Number.isFinite(offeringId))return NextResponse.json({ok:false,error:'Select a course and provide a title and message.'},{status:400});
    const owned=(await sql`select id,class_id from edu_course_offerings where id=${offeringId} and lecturer_user_id=${access.user.id} limit 1`)[0];
    if(!owned)return NextResponse.json({ok:false,error:'Course offering not found.'},{status:404});
    const rows=await sql`insert into edu_announcements (author_user_id,offering_id,class_id,title,body,published_at) values (${access.user.id},${offeringId},${owned.class_id},${title},${body},now()) returning *`;
    await sql`insert into edu_audit_logs (actor_user_id,action,entity_type,entity_id,metadata) values (${access.user.id},'announcement_published','edu_announcement',${String(rows[0].id)},${JSON.stringify({offeringId:String(offeringId),title})}::jsonb)`;
    return NextResponse.json({ok:true,announcement:rows[0]});
  }catch(error){console.error('Lecturer announcement publish unavailable:',error);return NextResponse.json({ok:false,error:'Unable to publish announcement.'},{status:503});}
}
