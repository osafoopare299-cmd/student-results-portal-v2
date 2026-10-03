import RecommendedBooksManager from '../../recommended-books-manager';

export const metadata = {
  title: 'Recommended Books | Lecturer',
  description: 'Upload downloadable course books for enrolled students.',
};
export const dynamic = 'force-dynamic';

export default function LecturerRecommendedBooksPage() {
  return <RecommendedBooksManager role="lecturer"/>;
}
