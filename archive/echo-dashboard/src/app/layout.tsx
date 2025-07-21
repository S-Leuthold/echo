import Sidebar from '../components/Sidebar';
import './globals.css';

export const metadata = {
  title: 'Echo',
  description: 'Your daily command center',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="flex flex-row h-screen bg-zinc-900 text-zinc-100">
          <Sidebar />
          {/* This main tag is simplified to allow children to control their own layout */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
} 