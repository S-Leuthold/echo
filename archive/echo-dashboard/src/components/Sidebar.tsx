"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BookText, BarChart2, Settings } from 'lucide-react';

const navLinks = [
  { href: '/today', label: 'Today', icon: <LayoutDashboard size={20} /> },
  { href: '/journal', label: 'Journal', icon: <BookText size={20} /> },
  { href: '/analytics', label: 'Analytics', icon: <BarChart2 size={20} /> },
  { href: '/settings', label: 'Settings', icon: <Settings size={20} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-64 flex flex-col py-8 px-4 bg-zinc-800 shadow-lg border-r border-zinc-800 min-h-screen">
      <div className="mb-10 text-3xl font-extrabold tracking-tight text-zinc-100">Echo</div>
      <nav className="flex flex-col space-y-2">
        {navLinks.map(link => {
          const isActive = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 text-base
                ${isActive ? 'bg-zinc-900 text-zinc-100 font-semibold' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
} 