import AssessmentHub from '../../assessment-hub';

export const metadata = {
  title: 'Assessment Management | Dropare Education',
  description: 'Lecturer workspace for creating and managing academic assessments.',
};

export default function LecturerAssessmentPage() {
  return <AssessmentHub mode="lecturer"/>;
}
