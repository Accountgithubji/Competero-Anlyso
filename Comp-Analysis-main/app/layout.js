import './globals.css';
import { Toaster } from '@/components/ui/sonner';

export const metadata = {
  title: 'YT Competitor Pulse — NEET/AYUSH Edu Dashboard',
  description: 'AI-powered YouTube competitor analysis dashboard'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  );
}
