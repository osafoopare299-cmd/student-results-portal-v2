import { neon } from '@neondatabase/serverless';

export function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not configured');
  return neon(url);
}

export function getEducationSql() {
  const url = process.env.EDUCATION_DATABASE_URL;
  if (!url) throw new Error('EDUCATION_DATABASE_URL is not configured');
  return neon(url);
}

export function educationDatabaseIsIsolated() {
  const educationUrl = process.env.EDUCATION_DATABASE_URL;
  const resultsUrl = process.env.DATABASE_URL;
  return Boolean(educationUrl && (!resultsUrl || educationUrl !== resultsUrl));
}
