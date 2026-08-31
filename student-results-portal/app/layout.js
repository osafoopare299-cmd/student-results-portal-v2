import './globals.css';

export const metadata = {
  title: {
    default: 'Dropare Student Education System',
    template: '%s | Dropare Education',
  },
  description: 'Mobile-first learning, assessment and academic progress platform.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
