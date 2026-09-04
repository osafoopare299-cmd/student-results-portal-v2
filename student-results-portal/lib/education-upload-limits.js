export const EDUCATION_PDF_MAX_BYTES=50*1024*1024;
export const EDUCATION_VIDEO_MAX_BYTES=250*1024*1024;

export function educationUploadLimitFor(type){
  return type==='pdf'?EDUCATION_PDF_MAX_BYTES:type==='video'?EDUCATION_VIDEO_MAX_BYTES:0;
}

export function educationUploadLimitLabel(type){
  return type==='pdf'?'50 MB':type==='video'?'250 MB':'0 MB';
}

export function validEducationFileMetadata(type,contentType,sizeBytes){
  const size=Number(sizeBytes||0);
  const allowed=type==='pdf'?['application/pdf']:type==='video'?['video/mp4','video/webm','video/quicktime']:[];
  const limit=educationUploadLimitFor(type);
  return Boolean(limit&&size>0&&size<=limit&&allowed.includes(String(contentType||'').toLowerCase()));
}
