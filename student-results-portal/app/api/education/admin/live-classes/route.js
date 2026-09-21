import { handleGetLiveClasses,handlePostLiveClasses } from '../../lecturer/live-classes/route';
export const dynamic='force-dynamic';
export async function GET(){return handleGetLiveClasses('admin');}
export async function POST(request){return handlePostLiveClasses(request,'admin');}
