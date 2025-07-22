"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Calendar, BarChart3, Settings, BookOpen, Mail, Moon, Cog } from "lucide-react";
import { usePlanStatus } from "@/contexts/PlanStatusContext";

const getNavigation = (emailSummary: any) => [
  {
    name: "Today",
    href: "/today",
    icon: Calendar,
  },
  {
    name: "Email", 
    href: "/email",
    icon: Mail,
    badge: emailSummary?.total_emails || 0, // Dynamic email count
    urgentBadge: emailSummary?.urgent_emails > 0 ? emailSummary.urgent_emails : undefined, // Only show if > 0
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
    name: "Config Wizard",
    href: "/config-wizard",
    icon: Cog,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { planStatus, todayData } = usePlanStatus();
  
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
    
    // Handle no plan state
    if (planStatus === 'missing') {
      const emailCount = todayData?.email_summary?.action_items?.length || 0;
      if (emailCount > 0) {
        return `You have ${emailCount} email action items waiting. Ready to plan your day?`;
      } else {
        return hour < 18 
          ? "No plan for today yet. What would you like to focus on?"
          : "Time to plan tomorrow. What are your priorities?";
      }
    }
    
    if (planStatus === 'loading') {
      return "Checking today's schedule...";
    }
    
    if (planStatus === 'error') {
      return "Having trouble loading your plan. Everything okay?";
    }
    
    // Use live schedule data when available
    const schedule = todayData?.blocks || [];
    
    if (schedule.length > 0) {
      // Find current session
      const activeSession = schedule.find((session: any) => {
        const startTime = parseTime(session.start_time);
        const endTime = parseTime(session.end_time);
        const startMinutes = startTime.hours * 60 + startTime.minutes;
        const endMinutes = endTime.hours * 60 + endTime.minutes;
        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      });
      
      if (activeSession) {
        const label = activeSession.label.split(' | ').pop(); // Get task name
        return `Ready to dive back into ${label}?`;
      }
      
      // Find next upcoming session
      const nextSession = schedule.find((session: any) => {
        const startTime = parseTime(session.start_time);
        const startMinutes = startTime.hours * 60 + startTime.minutes;
        return startMinutes > currentMinutes;
      });
      
      if (nextSession) {
        const startTime = parseTime(nextSession.start_time);
        const startMinutes = startTime.hours * 60 + startTime.minutes;
        const minutesUntil = startMinutes - currentMinutes;
        const label = nextSession.label.split(' | ').pop();
        const emoji = nextSession.emoji || '📅';
        
        if (minutesUntil < 60) {
          return `${emoji} ${label} starts in ${minutesUntil} minutes.`;
        } else if (minutesUntil < 120) {
          return `Coming up: ${emoji} ${label} in about an hour.`;
        } else {
          return `Your next session is ${emoji} ${label} at ${nextSession.start_time}.`;
        }
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
  
  // Helper function to parse time strings
  const parseTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return { hours, minutes };
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
        {getNavigation(todayData?.email_summary).map((item) => {
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