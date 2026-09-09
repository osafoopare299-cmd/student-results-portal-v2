export async function ensureEducationAiMaterialSchema(sql){
  await sql`alter table edu_learning_materials add column if not exists ai_processing_status text not null default 'not_processed'`;
  await sql`alter table edu_learning_materials add column if not exists ai_processed_at timestamptz`;
  await sql`alter table edu_learning_materials add column if not exists ai_processing_error text`;
  await sql`create table if not exists edu_learning_material_chunks(
    id bigserial primary key,
    material_id bigint not null references edu_learning_materials(id) on delete cascade,
    chunk_index integer not null,
    content text not null,
    created_at timestamptz not null default now(),
    unique(material_id,chunk_index)
  )`;
  await sql`create index if not exists edu_learning_material_chunks_material_idx on edu_learning_material_chunks(material_id,chunk_index)`;
}

export function chunkEducationText(text,maxChars=6000){
  const clean=String(text||'').replace(/\r/g,'').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  if(!clean)return [];
  const chunks=[];let start=0;
  while(start<clean.length){
    let end=Math.min(start+maxChars,clean.length);
    if(end<clean.length){const boundary=Math.max(clean.lastIndexOf('\n\n',end),clean.lastIndexOf('. ',end));if(boundary>start+Math.floor(maxChars*.55))end=boundary+1;}
    const part=clean.slice(start,end).trim();if(part)chunks.push(part);
    start=end;
  }
  return chunks.slice(0,500);
}
