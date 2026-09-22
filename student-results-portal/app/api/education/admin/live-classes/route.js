import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getEducationSql } from '../../../../../lib/db';
import { handleGetLiveClasses,handlePostLiveClasses } from '../../lecturer/live-classes/route';
export const dynamic='force-dynamic';

async function administratorAccess(){
  if(!(await isAdmin())) return {ok:false,reason:'unauthenticated'};
  const email=String(process.env.EDUCATION_ADMIN_EMAIL||'').trim();
  if(!email) return {ok:false,reason:'setup'};
  const sql=getEducationSql();
  const user=(await sql`select id,email,full_name,role,status from edu_users where lower(email)=lower(${email}) and role='admin' and status='active' limit 1`)[0];
  return user?{ok:true,user}:{ok:false,reason:'unregistered'};
}

function denied(access){
  const setup=access.reason==='setup'||access.reason==='unregistered';
  return NextResponse.json({ok:false,error:setup?'Administrator account setup is incomplete.':'Administrator sign-in required.'},{status:setup?503:401});
}

export async function GET(){const access=await administratorAccess();return access.ok?handleGetLiveClasses('admin',access):denied(access);}
export async function POST(request){const access=await administratorAccess();return access.ok?handlePostLiveClasses(request,'admin',access):denied(access);}
