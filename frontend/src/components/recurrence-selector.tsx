"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface Recurrence {
  type: "weekly" | "bi-weekly" | "monthly";
  days?: string[];
  week?: "A" | "B";
  monthlyType?: "date" | "weekday";
  monthlyDate?: number;
  monthlyWeek?: "first" | "second" | "third" | "fourth" | "last";
  monthlyWeekday?: string;
}

interface RecurrenceSelectorProps {
  recurrence: Recurrence;
  onChange: (recurrence: Recurrence) => void;
}

const DAYS_OF_WEEK = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

const DAY_LABELS = {
  monday: "Mon",
  tuesday: "Tue", 
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun"
};

const WEEKDAY_OPTIONS = [
  { value: "first", label: "First" },
  { value: "second", label: "Second" },
  { value: "third", label: "Third" },
  { value: "fourth", label: "Fourth" },
  { value: "last", label: "Last" }
];

export function RecurrenceSelector({ recurrence, onChange }: RecurrenceSelectorProps) {
  const [activeTab, setActiveTab] = useState<string>(recurrence.type);

  const handleTabChange = (newType: "weekly" | "bi-weekly" | "monthly") => {
    setActiveTab(newType);
    
    if (newType === "weekly") {
      onChange({
        type: "weekly",
        days: recurrence.days || ["monday", "tuesday", "wednesday", "thursday", "friday"]
      });
    } else if (newType === "bi-weekly") {
      onChange({
        type: "bi-weekly",
        days: recurrence.days || ["monday", "tuesday", "wednesday", "thursday", "friday"],
        week: "A"
      });
    } else if (newType === "monthly") {
      onChange({
        type: "monthly",
        monthlyType: "date",
        monthlyDate: 1
      });
    }
  };

  const handleDayToggle = (day: string) => {
    if (!recurrence.days) return;
    
    const updatedDays = recurrence.days.includes(day)
      ? recurrence.days.filter(d => d !== day)
      : [...recurrence.days, day];
    
    onChange({
      ...recurrence,
      days: updatedDays
    });
  };

  const renderDaySelector = () => (
    <div className="space-y-2">
      <Label>Days of Week</Label>
      <div className="flex flex-wrap gap-2">
        {DAYS_OF_WEEK.map(day => (
          <button
            key={day}
            type="button"
            onClick={() => handleDayToggle(day)}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              recurrence.days?.includes(day)
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-accent"
            }`}
          >
            {DAY_LABELS[day as keyof typeof DAY_LABELS]}
          </button>
        ))}
      </div>
      {recurrence.days?.length === 0 && (
        <p className="text-xs text-red-500">At least one day must be selected</p>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <Label>Recurrence Pattern</Label>
      
      {/* Tab buttons */}
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        {[
          { key: "weekly", label: "Weekly" },
          { key: "bi-weekly", label: "Bi-Weekly" },
          { key: "monthly", label: "Monthly" }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key as "weekly" | "bi-weekly" | "monthly")}
            className={`flex-1 px-3 py-2 text-xs font-medium rounded-md transition-all ${
              activeTab === tab.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content based on selected tab */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          {renderDaySelector()}
          <p className="text-xs text-muted-foreground">
            This block will occur every week on the selected days.
          </p>
        </div>
      )}

      {activeTab === "bi-weekly" && (
        <div className="space-y-4">
          {renderDaySelector()}
          
          <div className="space-y-2">
            <Label>Which Week</Label>
            <div className="flex gap-2">
              {["A", "B"].map(week => (
                <button
                  key={week}
                  type="button"
                  onClick={() => onChange({ ...recurrence, week: week as "A" | "B" })}
                  className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                    recurrence.week === week
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-accent"
                  }`}
                >
                  Week {week}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Choose whether this occurs on Week A or Week B of the bi-weekly cycle.
            </p>
          </div>
        </div>
      )}

      {activeTab === "monthly" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Monthly Pattern</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onChange({ 
                  ...recurrence, 
                  monthlyType: "date",
                  monthlyDate: recurrence.monthlyDate || 1
                })}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  recurrence.monthlyType === "date"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-accent"
                }`}
              >
                On Date
              </button>
              <button
                type="button"
                onClick={() => onChange({ 
                  ...recurrence, 
                  monthlyType: "weekday",
                  monthlyWeek: "first",
                  monthlyWeekday: "monday"
                })}
                className={`px-4 py-2 text-sm rounded-md border transition-colors ${
                  recurrence.monthlyType === "weekday"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-accent"
                }`}
              >
                On Weekday
              </button>
            </div>
          </div>

          {recurrence.monthlyType === "date" && (
            <div className="space-y-2">
              <Label htmlFor="monthlyDate">Day of Month</Label>
              <Input
                id="monthlyDate"
                type="number"
                min="1"
                max="31"
                value={recurrence.monthlyDate || 1}
                onChange={(e) => onChange({ 
                  ...recurrence, 
                  monthlyDate: parseInt(e.target.value) || 1 
                })}
              />
              <p className="text-xs text-muted-foreground">
                This block will occur on day {recurrence.monthlyDate || 1} of every month.
              </p>
            </div>
          )}

          {recurrence.monthlyType === "weekday" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Which Week</Label>
                  <Select 
                    value={recurrence.monthlyWeek || "first"} 
                    onValueChange={(value) => onChange({ 
                      ...recurrence, 
                      monthlyWeek: value as "first" | "second" | "third" | "fourth" | "last"
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_OPTIONS.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select 
                    value={recurrence.monthlyWeekday || "monday"} 
                    onValueChange={(value) => onChange({ 
                      ...recurrence, 
                      monthlyWeekday: value 
                    })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map(day => (
                        <SelectItem key={day} value={day}>
                          {day.charAt(0).toUpperCase() + day.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <p className="text-xs text-muted-foreground">
                This block will occur on the {recurrence.monthlyWeek} {recurrence.monthlyWeekday} of every month.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}