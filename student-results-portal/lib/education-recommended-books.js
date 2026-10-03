import { EDUCATION_BOOK_CONTENT_TYPES, EDUCATION_FILE_MAX_BYTES } from './education-upload-limits';
import { ensureEducationMaterialFileSchema } from './education-material-files';

export const BOOK_EXTENSIONS = ['.pdf', '.epub', '.mobi', '.azw', '.azw3'];

export function cleanBookText(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

export function bookTitleFromFilename(filename) {
  return cleanBookText(filename, 500)
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Recommended book';
}

export function validRecommendedBookFile(filename, contentType, sizeBytes) {
  const name = String(filename || '').toLowerCase();
  const type = String(contentType || '').toLowerCase();
  const size = Number(sizeBytes || 0);
  return BOOK_EXTENSIONS.some(extension => name.endsWith(extension))
    && EDUCATION_BOOK_CONTENT_TYPES.includes(type)
    && size > 0
    && size <= EDUCATION_FILE_MAX_BYTES;
}

export function recommendedBookMaterialType(filename) {
  return String(filename || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'file';
}

export async function ensureRecommendedBooksSchema(sql) {
  await ensureEducationMaterialFileSchema(sql);
}

export async function findRecommendedBook(sql, id, role, userId, manage = false) {
  const bookId = Number(id);
  if (!Number.isInteger(bookId) || bookId < 1) return null;
  if (role === 'admin') {
    return (await sql`select m.*,o.lecturer_user_id from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id where m.id=${bookId} and m.is_recommended_book=true limit 1`)[0] || null;
  }
  if (manage) {
    return (await sql`select m.*,o.lecturer_user_id from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id where m.id=${bookId} and m.is_recommended_book=true and o.lecturer_user_id=${userId} and m.created_by=${userId} limit 1`)[0] || null;
  }
  return (await sql`select m.*,o.lecturer_user_id from edu_learning_materials m join edu_course_offerings o on o.id=m.offering_id where m.id=${bookId} and m.is_recommended_book=true and o.lecturer_user_id=${userId} limit 1`)[0] || null;
}
