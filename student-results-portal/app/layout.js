import './globals.css';
import PWARegister from './education/pwa-register';

export const metadata = {
  title: {
    default: 'Dropare Student Education System',
    template: '%s | Dropare Education',
  },
  description: 'Mobile-first learning, assessment and academic progress platform.',
  manifest: '/manifest.webmanifest',
  applicationName: 'Dropare Education',
  appleWebApp: {
    capable: true,
    title: 'Dropare Education',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#166534',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><PWARegister />{children}</body>
    </html>
  );
}
