import AssessmentHub from '../../assessment-hub';

export const metadata = {
  title: 'Assessments | Dropare Education',
  description: 'Student MCQ, written, viva, OSCE and practical assessment workspace.',
};

export default function StudentAssessmentPage() {
  return <AssessmentHub mode="student"/>;
}
