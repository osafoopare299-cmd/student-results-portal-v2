import './globals.css';

export const metadata = {
  title: 'Student Results Portal',
  description: 'Secure mobile-first student results portal',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
