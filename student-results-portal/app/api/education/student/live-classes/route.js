import { NextResponse } from 'next/server';
import { getEducationUser } from '../../../../../lib/education-session';
import { getEducationSql } from '../../../../../lib/db';
import { createDailyToken, dailyRoomUrl } from '../../../../../lib/daily-video';
import { closeAttendance, ensureLiveClassroomSchema } from '../../../../../lib/education-live-classroom';

export const dynamic='force-dynamic';

async function enrolledClass(sql,classId,userId){return (await sql`select l.*,c.code,c.title as course_title,cl.name as class_name from edu_live_classes l join edu_course_offerings o on o.id=l.offering_id join edu_enrolments e on e.offering_id=o.id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id where l.id=${classId} and e.student_user_id=${userId} and e.status='active' limit 1`)[0];}

export async function GET(){
  const access=await getEducationUser('student');if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{const sql=getEducationSql();await ensureLiveClassroomSchema(sql);
    const classes=await sql`select l.id,l.title,l.starts_at,l.ends_at,l.status,c.code,c.title as course_title,cl.name as class_name,br.id as breakout_id,br.name as breakout_name from edu_live_classes l join edu_course_offerings o on o.id=l.offering_id join edu_enrolments e on e.offering_id=o.id join edu_courses c on c.id=o.course_id join edu_classes cl on cl.id=o.class_id left join lateral (select b.id,b.name from edu_live_breakout_rooms b join edu_live_breakout_assignments ba on ba.breakout_room_id=b.id where b.live_class_id=l.id and ba.student_user_id=e.student_user_id limit 1) br on true where e.student_user_id=${access.user.id} and e.status='active' and l.ends_at>now()-interval '7 days' order by l.starts_at asc`;
    return NextResponse.json({ok:true,classes});
  }catch(error){console.error('Student live classes unavailable:',error);return NextResponse.json({ok:false,error:'Unable to load live classes.'},{status:503});}
}

export async function POST(request){
  const access=await getEducationUser('student');if(!access.ok)return NextResponse.json({ok:false,error:'Student access required.'},{status:401});
  try{const body=await request.json(),sql=getEducationSql();await ensureLiveClassroomSchema(sql);const liveClass=await enrolledClass(sql,Number(body.classId),access.user.id);if(!liveClass)return NextResponse.json({ok:false,error:'Live class not found.'},{status:404});
    if(body.action==='join-token'){
      let target={daily_room_name:liveClass.daily_room_name,name:'Main classroom'};
      if(body.breakoutId){const assigned=(await sql`select b.id,b.name,b.daily_room_name from edu_live_breakout_rooms b join edu_live_breakout_assignments a on a.breakout_room_id=b.id where b.id=${Number(body.breakoutId)} and b.live_class_id=${liveClass.id} and a.student_user_id=${access.user.id} limit 1`)[0];if(assigned)target=assigned;}
      const token=await createDailyToken({roomName:target.daily_room_name,user:access.user,expiresAt:liveClass.ends_at});
      return NextResponse.json({ok:true,url:`${dailyRoomUrl(target.daily_room_name)}?t=${token}`,roomName:target.name,classId:liveClass.id});
    }
    if(body.action==='joined'){
      await sql`insert into edu_live_attendance (live_class_id,user_id,first_joined_at,current_joined_at,join_count) values (${liveClass.id},${access.user.id},now(),now(),1) on conflict (live_class_id,user_id) do update set current_joined_at=coalesce(edu_live_attendance.current_joined_at,now()),join_count=edu_live_attendance.join_count+case when edu_live_attendance.current_joined_at is null then 1 else 0 end,updated_at=now()`;
      return NextResponse.json({ok:true});
    }
    if(body.action==='left'){await closeAttendance(sql,liveClass.id,access.user.id);return NextResponse.json({ok:true});}
    return NextResponse.json({ok:false,error:'Unknown attendance action.'},{status:400});
  }catch(error){console.error('Student live class action failed:',error);return NextResponse.json({ok:false,error:error.message||'Unable to join the live class.'},{status:503});}
}
