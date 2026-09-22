import { NextResponse } from 'next/server';
import { isAdmin } from '../../../../../lib/admin-auth';
import { handleGetLiveClasses,handlePostLiveClasses } from '../../lecturer/live-classes/route';
export const dynamic='force-dynamic';

async function administratorAccess(){
  if(!(await isAdmin())) return {ok:false,reason:'unauthenticated'};
  return {ok:true,user:{id:null,role:'admin',full_name:'Administrator'}};
}

function denied(){return NextResponse.json({ok:false,error:'Administrator sign-in required.'},{status:401});}

export async function GET(){const access=await administratorAccess();return access.ok?handleGetLiveClasses('admin',access):denied(access);}
export async function POST(request){const access=await administratorAccess();return access.ok?handlePostLiveClasses(request,'admin',access):denied(access);}
