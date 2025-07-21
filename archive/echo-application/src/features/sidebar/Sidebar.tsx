import Link from 'next/link';

/**
 * Sidebar component for Echo application.
 * Provides navigation links and project branding.
 * Uses custom theme colors and feature-based architecture.
 */
export default function Sidebar() {
  return (
    <aside className="w-64 bg-background-secondary p-6 border-r border-border-primary">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">Echo</h1>
      </div>
      <nav>
        <ul className="space-y-2">
          <li>
            <Link href="/today" className="block p-2 rounded-md text-text-secondary hover:bg-accent-blue hover:text-white transition-colors">
              Today
            </Link>
          </li>
          <li>
            <Link href="/upcoming" className="block p-2 rounded-md text-text-secondary hover:bg-accent-blue hover:text-white transition-colors">
              Upcoming
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
