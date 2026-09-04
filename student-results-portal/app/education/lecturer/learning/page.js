import MaterialManager from './material-manager';

export const metadata = {
  title: 'Course Materials | Dropare Education',
  description: 'Lecturer workspace for creating and publishing approved course learning materials.',
};

export const dynamic = 'force-dynamic';

export default function LecturerLearningPage() {
  return <MaterialManager/>;
}
