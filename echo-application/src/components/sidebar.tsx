"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, BarChart3, Settings, BookOpen, Mail, Moon } from "lucide-react";

const navigation = [
  {
    name: "Today",
    href: "/today",
    icon: Calendar,
  },
  {
    name: "Email", 
    href: "/email",
    icon: Mail,
    badge: 8, // Total unresponded emails
    urgentBadge: 2, // Urgent emails
  },
  {
    name: "Analytics", 
    href: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Planning",
    href: "/planning",
    icon: Moon,
  },
  {
    name: "Journal",
    href: "/journal", 
    icon: BookOpen,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  
  // Generate time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    const name = "Dr. Leuthold"; // Could be made dynamic later
    
    if (hour < 12) {
      return `Good morning, ${name}`;
    } else if (hour < 17) {
      return `Good afternoon, ${name}`;
    } else {
      return `Good evening, ${name}`;
    }
  };

  // Generate dynamic, contextual subtitle based on current state
  const getContextualSubtitle = () => {
    const hour = new Date().getHours();
    const currentMinutes = hour * 60 + new Date().getMinutes();
    
    // Mock schedule data (would come from props or context in real app)
    const mockSchedule = [
      { startTime: "09:00", endTime: "11:00", label: "Frontend Build", emoji: "🚀", startMinutes: 9 * 60, state: "active" },
      { startTime: "12:00", endTime: "12:30", label: "Team Standup", emoji: "🤝", startMinutes: 12 * 60, state: "upcoming" },
      { startTime: "14:00", endTime: "16:00", label: "API Integration", emoji: "🔌", startMinutes: 14 * 60, state: "upcoming" }
    ];
    
    // Find current session
    const activeSession = mockSchedule.find(session => 
      currentMinutes >= session.startMinutes && 
      currentMinutes < (session.startMinutes + 120)
    );
    
    if (activeSession) {
      return `Ready to dive back into the ${activeSession.label}?`;
    }
    
    // Check for recently completed session
    const recentlyCompleted = mockSchedule.find(session => 
      session.state === "completed" && 
      currentMinutes >= (session.startMinutes + 120) && 
      currentMinutes <= (session.startMinutes + 150)
    );
    
    if (recentlyCompleted) {
      const nextSession = mockSchedule.find(session => session.state === "upcoming");
      if (nextSession) {
        return `Your next session is ${nextSession.emoji} ${nextSession.label} at ${nextSession.startTime}.`;
      } else {
        return "A light afternoon ahead. Perfect time for some deep work.";
      }
    }
    
    // Find next upcoming session
    const nextSession = mockSchedule
      .filter(session => session.startMinutes > currentMinutes)
      .sort((a, b) => a.startMinutes - b.startMinutes)[0];
    
    if (nextSession) {
      const minutesUntil = nextSession.startMinutes - currentMinutes;
      if (minutesUntil < 60) {
        return `${nextSession.emoji} ${nextSession.label} starts in ${minutesUntil} minutes.`;
      } else if (minutesUntil < 120) {
        return `Coming up: ${nextSession.emoji} ${nextSession.label} in about an hour.`;
      } else {
        return `Your next session is ${nextSession.emoji} ${nextSession.label} at ${nextSession.startTime}.`;
      }
    }
    
    // Default contextual messages based on time of day
    if (hour < 9) {
      return "What're we working on today?";
    } else if (hour < 12) {
      return "The morning energy is perfect for focused work.";
    } else if (hour < 14) {
      return "How's the day flowing so far?";
    } else if (hour < 17) {
      return "The afternoon is great for wrapping up tasks.";
    } else {
      return "Winding down or diving into evening work?";
    }
  };

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col">
      {/* Dynamic AI Persona Header */}
      <div className="p-6 border-b border-sidebar-border">
        <Link href="/today" className="block">
          <div className="text-sidebar-foreground font-medium text-lg leading-tight">
            {getGreeting()}
          </div>
          <div className="text-muted-foreground text-sm mt-1 leading-relaxed">
            {getContextualSubtitle()}
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive
                  ? "bg-accent text-accent-foreground shadow-lg shadow-accent/20"
                  : "text-muted-foreground hover:bg-accent/10 hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center space-x-3">
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
              
              {/* Notification badges */}
              {item.urgentBadge && (
                <Badge variant="destructive" className="h-5 px-1.5 text-xs font-semibold">
                  {item.urgentBadge}
                </Badge>
              )}
              {item.badge && !item.urgentBadge && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs font-semibold">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="text-xs text-muted-foreground">
          {new Date().toLocaleDateString("en-US", { 
            weekday: "long", 
            month: "short", 
            day: "numeric" 
          })}
        </div>
      </div>
    </div>
  );
}