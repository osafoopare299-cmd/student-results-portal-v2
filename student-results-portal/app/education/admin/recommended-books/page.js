import RecommendedBooksManager from '../../recommended-books-manager';

export const metadata = {
  title: 'Recommended Books | Administrator',
  description: 'Manage downloadable recommended books across Education courses.',
};
export const dynamic = 'force-dynamic';

export default function AdminRecommendedBooksPage() {
  return <RecommendedBooksManager role="admin"/>;
}
