export async function ensureEducationMaterialFileSchema(sql){
  await sql`alter table edu_learning_materials add column if not exists blob_pathname text`;
  await sql`alter table edu_learning_materials add column if not exists original_filename text`;
  await sql`alter table edu_learning_materials add column if not exists file_content_type text`;
  await sql`alter table edu_learning_materials add column if not exists file_size_bytes bigint`;
  await sql`do $$ begin
    if not exists (
      select 1 from pg_constraint
      where conname='edu_learning_materials_material_type_check'
        and pg_get_constraintdef(oid) like '%file%'
    ) then
      alter table edu_learning_materials drop constraint if exists edu_learning_materials_material_type_check;
      alter table edu_learning_materials add constraint edu_learning_materials_material_type_check check (material_type in ('note','pdf','video','file','link'));
    end if;
  end $$`;
  await sql`create index if not exists edu_learning_materials_blob_path_idx on edu_learning_materials(blob_pathname) where blob_pathname is not null`;
}

export function educationBlobConfigured(){
  // A connected Vercel Blob store injects this project-specific token.
  // Do not treat the generic Vercel OIDC token as proof that a Blob store exists.
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function materialFileHref(material,scope='student'){
  if(material?.blob_pathname)return `/api/education/${scope}/material-file?materialId=${encodeURIComponent(material.id)}`;
  return material?.resource_url||null;
}
