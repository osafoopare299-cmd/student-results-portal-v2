import StudentMaterials from './student-materials';

export const metadata = {
  title: 'Learning Hub | Dropare Education',
  description: 'Published course materials for the signed-in student’s active enrolments.',
};

export const dynamic = 'force-dynamic';

export default function StudentLearningPage() {
  return <StudentMaterials/>;
}
