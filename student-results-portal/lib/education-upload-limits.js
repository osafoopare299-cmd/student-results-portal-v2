export const EDUCATION_PDF_MAX_BYTES=250*1024*1024;
export const EDUCATION_VIDEO_MAX_BYTES=1024*1024*1024;
export const EDUCATION_FILE_MAX_BYTES=250*1024*1024;

export const EDUCATION_FILE_CONTENT_TYPES=[
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain','text/csv','text/markdown','application/rtf',
  'image/jpeg','image/png','image/gif','image/webp','image/svg+xml',
  'audio/mpeg','audio/mp4','audio/wav','audio/ogg',
  'application/zip','application/x-zip-compressed','application/octet-stream'
];

export const EDUCATION_VIDEO_CONTENT_TYPES=['video/mp4','video/webm','video/quicktime','video/x-msvideo','video/mpeg'];

export function educationUploadLimitFor(type){
  return type==='pdf'?EDUCATION_PDF_MAX_BYTES:type==='video'?EDUCATION_VIDEO_MAX_BYTES:type==='file'?EDUCATION_FILE_MAX_BYTES:0;
}

export function educationUploadLimitLabel(type){
  return type==='pdf'?'250 MB':type==='video'?'1 GB':type==='file'?'250 MB':'0 MB';
}

export function validEducationFileMetadata(type,contentType,sizeBytes){
  const size=Number(sizeBytes||0);
  const allowed=type==='pdf'?['application/pdf']:type==='video'?EDUCATION_VIDEO_CONTENT_TYPES:type==='file'?EDUCATION_FILE_CONTENT_TYPES:[];
  const limit=educationUploadLimitFor(type);
  return Boolean(limit&&size>0&&size<=limit&&allowed.includes(String(contentType||'').toLowerCase()));
}
