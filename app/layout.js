import './globals.css';

export const metadata = {
  title: 'KeepAlive Manager',
  description: 'Admin web app for managing PostgreSQL keepalive targets',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 antialiased">{children}</body>
    </html>
  );
}
