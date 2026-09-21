import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { createDailyRoom, createDailyToken, dailyConfigured, dailyRoomUrl } from '../../../../../lib/daily-video';
import { cleanText, ensureLiveClassroomSchema, roomName } from '../../../../../lib/education-live-classroom';

export const dynamic = 'force-dynamic';

async function ownedClass(sql, classId, userId, role) {
  if(role==='admin') return (await sql`select l.*,c.code,c.title as course_title,cl.name as class_name from edu_live_classes l join edu_course_offerings o on o.id=l.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where l.id=${classId} limit 1`)[0];
  return (await sql`select l.*,c.code,c.title as course_title,cl.name as class_name from edu_live_classes l join edu_course_offerings o on o.id=l.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where l.id=${classId} and (o.lecturer_user_id=${userId} or l.host_user_id=${userId}) limit 1`)[0];
}

async function loadData(sql, userId, role) {
  if(role==='admin'){
    const [offerings,classes,hosts]=await Promise.all([
      sql`select o.id,c.code,c.title as course_title,cl.name as class_name,u.full_name as lecturer_name from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id left join edu_users u on u.id=o.lecturer_user_id order by c.code,cl.name`,
      sql`select l.id,l.offering_id,l.title,l.starts_at,l.ends_at,l.status,l.host_user_id,c.code,c.title as course_title,cl.name as class_name,h.full_name as host_name,count(distinct a.user_id)::int as attendees,coalesce(sum(a.total_seconds),0)::int as total_seconds from edu_live_classes l join edu_course_offerings o on o.id=l.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id left join edu_users h on h.id=l.host_user_id left join edu_live_attendance a on a.live_class_id=l.id group by l.id,c.code,c.title,cl.name,h.full_name order by l.starts_at desc limit 100`,
      sql`select id,full_name,role from edu_users where status='active' and role in ('admin','lecturer') order by role,full_name`
    ]);
    const breakouts=await sql`select b.id,b.live_class_id,b.name,b.daily_room_name,count(a.student_user_id)::int as assigned from edu_live_breakout_rooms b left join edu_live_breakout_assignments a on a.breakout_room_id=b.id group by b.id order by b.id`;
    return {offerings,hosts,classes:classes.map(x=>({...x,breakouts:breakouts.filter(b=>String(b.live_class_id)===String(x.id))}))};
  }
  const [offerings, classes] = await Promise.all([
    sql`select o.id,c.code,c.title as course_title,cl.name as class_name from edu_course_offerings o join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where o.lecturer_user_id=${userId} order by c.code`,
    sql`select l.id,l.offering_id,l.title,l.starts_at,l.ends_at,l.status,l.host_user_id,c.code,c.title as course_title,cl.name as class_name,h.full_name as host_name,count(distinct a.user_id)::int as attendees,coalesce(sum(a.total_seconds),0)::int as total_seconds from edu_live_classes l join edu_course_offerings o on o.id=l.offering_id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id left join edu_users h on h.id=l.host_user_id left join edu_live_attendance a on a.live_class_id=l.id where o.lecturer_user_id=${userId} or l.host_user_id=${userId} group by l.id,c.code,c.title,cl.name,h.full_name order by l.starts_at desc limit 100`,
  ]);
  const breakouts = await sql`select b.id,b.live_class_id,b.name,b.daily_room_name,count(a.student_user_id)::int as assigned from edu_live_breakout_rooms b join edu_live_classes l on l.id=b.live_class_id join edu_course_offerings o on o.id=l.offering_id left join edu_live_breakout_assignments a on a.breakout_room_id=b.id where o.lecturer_user_id=${userId} or l.host_user_id=${userId} group by b.id order by b.id`;
  return { offerings, classes: classes.map(x=>({...x,breakouts:breakouts.filter(b=>String(b.live_class_id)===String(x.id))})) };
}

export async function handleGetLiveClasses(role='lecturer') {
  const access = await getEducationUser(role);
  if (!access.ok) return NextResponse.json({ok:false,error:`${role==='admin'?'Administrator':'Lecturer'} access required.`},{status:401});
  try {
    const sql=getEducationSql(); await ensureLiveClassroomSchema(sql);
    return NextResponse.json({ok:true,configured:dailyConfigured(),...(await loadData(sql,access.user.id,role))});
  } catch (error) { console.error('Live classroom load failed:',error); return NextResponse.json({ok:false,error:error.message||'Unable to load live classes.'},{status:503}); }
}

export async function GET(){return handleGetLiveClasses('lecturer');}

export async function handlePostLiveClasses(request,role='lecturer') {
  const access=await getEducationUser(role);
  if(!access.ok)return NextResponse.json({ok:false,error:`${role==='admin'?'Administrator':'Lecturer'} access required.`},{status:401});
  try {
    const body=await request.json(),sql=getEducationSql(); await ensureLiveClassroomSchema(sql);
    if(body.action==='create'){
      const offeringId=Number(body.offeringId),title=cleanText(body.title),startsAt=new Date(body.startsAt),endsAt=new Date(body.endsAt);
      const offering=role==='admin'?(await sql`select o.id,c.code from edu_course_offerings o join edu_courses c on c.id=o.course_id where o.id=${offeringId} limit 1`)[0]:(await sql`select o.id,c.code from edu_course_offerings o join edu_courses c on c.id=o.course_id where o.id=${offeringId} and o.lecturer_user_id=${access.user.id} limit 1`)[0];
      if(!offering)return NextResponse.json({ok:false,error:'Course offering not found.'},{status:404});
      if(!title||Number.isNaN(startsAt.getTime())||Number.isNaN(endsAt.getTime())||endsAt<=startsAt)return NextResponse.json({ok:false,error:'Provide a title and valid start/end time.'},{status:400});
      let hostUserId=access.user.id;
      if(role==='admin'&&body.hostUserId){const host=(await sql`select id from edu_users where id=${Number(body.hostUserId)} and status='active' and role in ('admin','lecturer') limit 1`)[0];if(!host)return NextResponse.json({ok:false,error:'Selected host is not available.'},{status:400});hostUserId=host.id;}
      const name=roomName(offering.code,offeringId),daily=await createDailyRoom({name,startsAt,endsAt});
      const rows=await sql`insert into edu_live_classes (offering_id,title,starts_at,ends_at,daily_room_name,created_by,host_user_id) values (${offeringId},${title},${startsAt.toISOString()},${endsAt.toISOString()},${daily.name},${access.user.id},${hostUserId}) returning *`;
      return NextResponse.json({ok:true,liveClass:rows[0]});
    }
    if(body.action==='join'){
      const liveClass=await ownedClass(sql,Number(body.classId),access.user.id,role);
      if(!liveClass)return NextResponse.json({ok:false,error:'Live class not found.'},{status:404});
      let target={daily_room_name:liveClass.daily_room_name,name:'Main classroom'};
      if(body.breakoutId){target=(await sql`select id,name,daily_room_name from edu_live_breakout_rooms where id=${Number(body.breakoutId)} and live_class_id=${liveClass.id} limit 1`)[0]||target;}
      await sql`update edu_live_classes set status='live',updated_at=now() where id=${liveClass.id} and status='scheduled'`;
      const token=await createDailyToken({roomName:target.daily_room_name,user:access.user,owner:true,expiresAt:liveClass.ends_at});
      return NextResponse.json({ok:true,url:`${dailyRoomUrl(target.daily_room_name)}?t=${token}`,roomName:target.name,classId:liveClass.id});
    }
    if(body.action==='end'){
      const liveClass=await ownedClass(sql,Number(body.classId),access.user.id,role);
      if(!liveClass)return NextResponse.json({ok:false,error:'Live class not found.'},{status:404});
      await sql`update edu_live_classes set status='ended',updated_at=now() where id=${liveClass.id}`;
      await sql`update edu_live_attendance set total_seconds=total_seconds+greatest(0,extract(epoch from (now()-current_joined_at))::int),last_left_at=now(),current_joined_at=null,updated_at=now() where live_class_id=${liveClass.id} and current_joined_at is not null`;
      return NextResponse.json({ok:true});
    }
    if(body.action==='breakouts'){
      const liveClass=await ownedClass(sql,Number(body.classId),access.user.id,role),count=Math.min(8,Math.max(2,Number(body.count)||2));
      if(!liveClass)return NextResponse.json({ok:false,error:'Live class not found.'},{status:404});
      const students=await sql`select e.student_user_id from edu_enrolments e where e.offering_id=${liveClass.offering_id} and e.status='active' order by e.student_user_id`;
      await sql`delete from edu_live_breakout_rooms where live_class_id=${liveClass.id}`;
      const rooms=[];
      for(let i=0;i<count;i++){
        const name=roomName(`breakout-${liveClass.id}-${i+1}`,i+1),daily=await createDailyRoom({name,startsAt:new Date(),endsAt:liveClass.ends_at});
        const saved=(await sql`insert into edu_live_breakout_rooms (live_class_id,name,daily_room_name) values (${liveClass.id},${`Breakout ${i+1}`},${daily.name}) returning *`)[0];rooms.push(saved);
      }
      for(let i=0;i<students.length;i++)await sql`insert into edu_live_breakout_assignments (breakout_room_id,student_user_id) values (${rooms[i%rooms.length].id},${students[i].student_user_id}) on conflict do nothing`;
      return NextResponse.json({ok:true,rooms});
    }
    if(body.action==='attendance'){
      const liveClass=await ownedClass(sql,Number(body.classId),access.user.id,role);
      if(!liveClass)return NextResponse.json({ok:false,error:'Live class not found.'},{status:404});
      const attendance=await sql`select u.full_name,u.email,a.first_joined_at,a.last_left_at,a.join_count,a.total_seconds+case when a.current_joined_at is not null then extract(epoch from (now()-a.current_joined_at))::int else 0 end as total_seconds,(a.current_joined_at is not null) as online from edu_live_attendance a join edu_users u on u.id=a.user_id where a.live_class_id=${liveClass.id} order by online desc,u.full_name`;
      return NextResponse.json({ok:true,attendance});
    }
    return NextResponse.json({ok:false,error:'Unknown live-class action.'},{status:400});
  } catch(error){console.error('Live classroom action failed:',error);return NextResponse.json({ok:false,error:error.message||'Unable to update the live class.'},{status:503});}
}

export async function POST(request){return handlePostLiveClasses(request,'lecturer');}
