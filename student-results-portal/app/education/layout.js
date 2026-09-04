import PWARegister from './pwa-register';

export const metadata = {
  title: 'Education Portal',
  description: 'Dropare Student Education System for students, lecturers and administrators.',
  manifest: '/education/manifest.webmanifest',
  themeColor: '#0f5b3d',
};

export default function EducationLayout({ children }) {
  return <>{children}<PWARegister /></>;
}
