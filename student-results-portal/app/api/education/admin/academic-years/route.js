import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { getSql } from '../../../../../lib/db';

export const dynamic = 'force-dynamic';

async function guard(){
  if (!(await isAdmin())) return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});
  return null;
}

export async function GET(){
  const denied=await guard(); if(denied) return denied;
  try{
    const sql=getSql();
    const years=await sql`select id,name,starts_on,ends_on,is_active from edu_academic_years order by starts_on desc nulls last,name desc`;
    return NextResponse.json({ok:true,years});
  }catch(error){ console.error(error); return NextResponse.json({ok:false,error:'Education database setup is not ready yet.'},{status:503}); }
}

export async function POST(request){
  const denied=await guard(); if(denied) return denied;
  try{
    const body=await request.json();
    const name=String(body.name||'').trim();
    const startsOn=body.startsOn||null, endsOn=body.endsOn||null;
    const active=Boolean(body.isActive);
    if(!name) return NextResponse.json({ok:false,error:'Academic year name is required.'},{status:400});
    const sql=getSql();
    if(active) await sql`update edu_academic_years set is_active=false where is_active=true`;
    const rows=await sql`insert into edu_academic_years (name,starts_on,ends_on,is_active) values (${name},${startsOn},${endsOn},${active}) on conflict (name) do update set starts_on=excluded.starts_on,ends_on=excluded.ends_on,is_active=excluded.is_active returning id,name,starts_on,ends_on,is_active`;
    return NextResponse.json({ok:true,year:rows[0]});
  }catch(error){ console.error(error); return NextResponse.json({ok:false,error:'Unable to save academic year.'},{status:503}); }
}
