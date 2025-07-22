"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import { RecurrenceSelector } from "@/components/recurrence-selector";
import { Trash2 } from "lucide-react";

type BlockType = "anchor" | "fixed" | "flex";

interface Recurrence {
  type: "weekly" | "bi-weekly" | "monthly";
  days?: string[]; // For weekly/bi-weekly
  week?: "A" | "B"; // For bi-weekly
  monthlyType?: "date" | "weekday"; // For monthly
  monthlyDate?: number; // 1-31 for date type
  monthlyWeek?: "first" | "second" | "third" | "fourth" | "last"; // For weekday type  
  monthlyWeekday?: string; // monday, tuesday, etc for weekday type
}

interface KnownBlock {
  id: string;
  name: string;
  type: BlockType;
  start_time: string;
  duration: number; // in minutes
  category: string;
  description?: string;
  recurrence: Recurrence;
  // Keep days for backward compatibility with existing code
  days: string[]; // Which days of the week this applies to
}

interface Reminder {
  id: string;
  name: string;
  due_date: string; // ISO date string
  recurrence: "none" | "weekly" | "monthly" | "yearly";
  category: string;
  description?: string;
  is_completed: boolean;
}

interface ConfigWizardState {
  knownBlocks: KnownBlock[];
  reminders: Reminder[];
  editingBlock: KnownBlock | null;
  editingReminder: Reminder | null;
  showModal: boolean;
  modalType: "block" | "reminder";
}

// const DAYS_OF_WEEK = [
//   "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
// ];

const BLOCK_TYPES: { value: BlockType; label: string; description: string }[] = [
  { 
    value: "anchor", 
    label: "Anchor Block", 
    description: "Fixed, non-negotiable events (e.g., morning routine, sleep)" 
  },
  { 
    value: "fixed", 
    label: "Fixed Block", 
    description: "Scheduled appointments with hard start/end times" 
  },
  { 
    value: "flex", 
    label: "Flex Block", 
    description: "Tasks that can be moved by the AI planner" 
  }
];

const CATEGORIES = [
  "Personal", "Work", "Health", "Admin", "Learning", "Research", 
  "Writing", "Planning", "Social", "Exercise", "Meals"
];

export default function ConfigWizard() {
  const [state, setState] = useState<ConfigWizardState>({
    knownBlocks: [],
    reminders: [],
    editingBlock: null,
    editingReminder: null,
    showModal: false,
    modalType: "block"
  });
  const [loading, setLoading] = useState(false);

  // Load existing configuration on component mount
  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setLoading(true);
        
        // Load blocks from server
        const response = await fetch('http://localhost:8000/config/load');
        const result = await response.json();
        
        // Load reminders from localStorage
        const savedReminders = localStorage.getItem('echo_reminders');
        const reminders = savedReminders ? JSON.parse(savedReminders) : [];
        
        setState(prev => ({
          ...prev,
          knownBlocks: (response.ok && result.known_blocks) ? result.known_blocks : [],
          reminders: reminders
        }));
      } catch (error) {
        console.error("Error loading existing configuration:", error);
        // Don't show error to user - just start with empty config
      } finally {
        setLoading(false);
      }
    };

    loadExistingConfig();
  }, []);

  const createNewBlock = (): KnownBlock => ({
    id: `new_${Date.now()}`,
    name: "",
    type: "anchor",
    start_time: "09:00",
    duration: 60,
    category: "Personal",
    description: "",
    recurrence: {
      type: "weekly",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
    },
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"] // Keep for backward compatibility
  });

  const createNewReminder = (): Reminder => ({
    id: `new_reminder_${Date.now()}`,
    name: "",
    due_date: new Date().toISOString().split('T')[0], // Today's date
    recurrence: "none",
    category: "Personal",
    description: "",
    is_completed: false
  });

  const handleBlockSave = async (block: KnownBlock) => {
    // Generate a proper ID for new blocks
    if (block.id.startsWith('new_')) {
      block.id = `block_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    setState(prev => {
      const isEditing = prev.editingBlock && !prev.editingBlock.id.startsWith('new_');
      const updatedBlocks = isEditing
        ? prev.knownBlocks.map(b => b.id === block.id ? block : b)
        : [...prev.knownBlocks, block];
        
      console.log('Saving block:', block);
      console.log('Updated blocks:', updatedBlocks);
      
      return {
        ...prev,
        knownBlocks: updatedBlocks,
        editingBlock: null,
        showModal: false
      };
    });

    // Auto-save configuration to server
    try {
      setLoading(true);
      const updatedBlocks = state.editingBlock && !state.editingBlock.id.startsWith('new_')
        ? state.knownBlocks.map(b => b.id === block.id ? block : b)
        : [...state.knownBlocks, block];
        
      const response = await fetch('http://localhost:8000/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          known_blocks: updatedBlocks
        })
      });

      if (response.ok) {
        console.log('Configuration auto-saved successfully');
      } else {
        console.warn('Failed to auto-save configuration');
      }
    } catch (error) {
      console.error('Error auto-saving configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReminderSave = async (reminder: Reminder) => {
    // Generate a proper ID for new reminders
    if (reminder.id.startsWith('new_reminder_')) {
      reminder.id = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    setState(prev => {
      const isEditing = prev.editingReminder && !prev.editingReminder.id.startsWith('new_reminder_');
      const updatedReminders = isEditing
        ? prev.reminders.map(r => r.id === reminder.id ? reminder : r)
        : [...prev.reminders, reminder];
        
      console.log('Saving reminder:', reminder);
      console.log('Updated reminders:', updatedReminders);
      
      return {
        ...prev,
        reminders: updatedReminders,
        editingReminder: null,
        showModal: false
      };
    });

    // Auto-save reminders to localStorage for now (can be extended to server)
    try {
      const updatedReminders = state.editingReminder && !state.editingReminder.id.startsWith('new_reminder_')
        ? state.reminders.map(r => r.id === reminder.id ? reminder : r)
        : [...state.reminders, reminder];
        
      localStorage.setItem('echo_reminders', JSON.stringify(updatedReminders));
      console.log('Reminders auto-saved to localStorage');
    } catch (error) {
      console.error('Error saving reminders:', error);
    }
  };

  const handleReminderDelete = (reminderId: string) => {
    setState(prev => ({
      ...prev,
      reminders: prev.reminders.filter(r => r.id !== reminderId)
    }));

    // Update localStorage
    try {
      const updatedReminders = state.reminders.filter(r => r.id !== reminderId);
      localStorage.setItem('echo_reminders', JSON.stringify(updatedReminders));
    } catch (error) {
      console.error('Error deleting reminder:', error);
    }
  };

  // Helper function to calculate relative time
  const getRelativeTime = (dateStr: string, recurrence: string): string => {
    const today = new Date();
    const inputDate = new Date(dateStr + 'T00:00:00');
    
    // For yearly recurrence, calculate the next occurrence
    let dueDate = inputDate;
    if (recurrence === 'yearly') {
      const currentYear = today.getFullYear();
      const thisYearDate = new Date(currentYear, inputDate.getMonth(), inputDate.getDate());
      const nextYearDate = new Date(currentYear + 1, inputDate.getMonth(), inputDate.getDate());
      
      // Use this year's date if it hasn't passed, otherwise next year's
      dueDate = thisYearDate >= today ? thisYearDate : nextYearDate;
    }
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays === -1) return "Yesterday";
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays <= 7) return `${diffDays} days`;
    
    return dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Helper function to determine urgency
  const getUrgencyLevel = (dateStr: string, recurrence: string): 'overdue' | 'urgent' | 'soon' | 'normal' => {
    const today = new Date();
    const inputDate = new Date(dateStr + 'T00:00:00');
    
    // For yearly recurrence, calculate the next occurrence
    let dueDate = inputDate;
    if (recurrence === 'yearly') {
      const currentYear = today.getFullYear();
      const thisYearDate = new Date(currentYear, inputDate.getMonth(), inputDate.getDate());
      const nextYearDate = new Date(currentYear + 1, inputDate.getMonth(), inputDate.getDate());
      
      // Use this year's date if it hasn't passed, otherwise next year's
      dueDate = thisYearDate >= today ? thisYearDate : nextYearDate;
    }
    
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 1) return 'urgent';
    if (diffDays <= 3) return 'soon';
    return 'normal';
  };

  const handleBlockDelete = async (blockId: string) => {
    setState(prev => ({
      ...prev,
      knownBlocks: prev.knownBlocks.filter(b => b.id !== blockId)
    }));

    // Auto-save configuration to server
    try {
      const updatedBlocks = state.knownBlocks.filter(b => b.id !== blockId);
      const response = await fetch('http://localhost:8000/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          known_blocks: updatedBlocks
        })
      });

      if (response.ok) {
        console.log('Block deleted and configuration auto-saved');
      } else {
        console.warn('Failed to auto-save after block deletion');
      }
    } catch (error) {
      console.error('Error auto-saving after block deletion:', error);
    }
  };

  // Sort reminders chronologically
  const sortedReminders = [...state.reminders].sort((a, b) => {
    const dateA = new Date(a.due_date + 'T00:00:00').getTime();
    const dateB = new Date(b.due_date + 'T00:00:00').getTime();
    return dateA - dateB;
  });

  const openModal = (block?: KnownBlock, reminder?: Reminder) => {
    setState(prev => ({
      ...prev,
      editingBlock: block || (reminder ? null : createNewBlock()),
      editingReminder: reminder || (block ? null : createNewReminder()),
      modalType: reminder ? "reminder" : "block",
      showModal: true
    }));
  };

  const closeModal = () => {
    setState(prev => ({
      ...prev,
      editingBlock: null,
      editingReminder: null,
      showModal: false
    }));
  };

  // const handleBlockDelete = (blockId: string) => {
  //   setState(prev => ({
  //     ...prev,
  //     knownBlocks: prev.knownBlocks.filter(b => b.id !== blockId)
  //   }));
  // };

  const handleExportConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/config/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          known_blocks: state.knownBlocks
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        alert(`Success: ${result.message}`);
        console.log("Configuration saved to:", result.config_path);
      } else {
        alert(`Error: ${result.detail || 'Failed to save configuration'}`);
      }
    } catch (error) {
      console.error("Error saving configuration:", error);
      alert("Error: Failed to connect to the server. Make sure the API server is running.");
    } finally {
      setLoading(false);
    }
  };

  // const addMinutes = (timeStr: string, minutes: number): string => {
  //   const [hours, mins] = timeStr.split(':').map(Number);
  //   const totalMinutes = hours * 60 + mins + minutes;
  //   const newHours = Math.floor(totalMinutes / 60) % 24;
  //   const newMins = totalMinutes % 60;
  //   return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  // };

  return (
    <div className="container max-w-full mx-auto p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Echo Configuration Wizard</h1>
          <p className="text-muted-foreground text-lg">Build your weekly schedule with recurring blocks and manage reminders</p>
        </div>
      </div>

      {/* Action Cards - Upper section */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Create Blocks and Reminders</h3>
        <div className="grid gap-6 md:grid-cols-4 max-w-6xl">
          {BLOCK_TYPES.map(type => (
            <Card 
              key={type.value} 
              className="p-5 cursor-pointer hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 group relative overflow-hidden"
              onClick={() => {
                const newBlock = createNewBlock();
                newBlock.type = type.value;
                openModal(newBlock);
              }}
            >
              <h4 className="font-medium text-sm mb-2">{type.label}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{type.description}</p>
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-xs text-accent-foreground font-bold">+</span>
                </div>
              </div>
            </Card>
          ))}
          
          {/* Add Reminder Card */}
          <Card 
            className="p-5 cursor-pointer hover:border-accent hover:shadow-lg hover:shadow-accent/10 transition-all duration-300 group relative overflow-hidden"
            onClick={() => openModal(undefined, createNewReminder())}
          >
            <h4 className="font-medium text-sm mb-2">Add Reminder</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">Bills, deadlines, and important dates</p>
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
              <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                <span className="text-xs text-accent-foreground font-bold">+</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content - Lower 2/3 */}
      <div className="grid gap-6" style={{ gridTemplateColumns: '3fr 1fr', height: '500px' }}>
        {/* Weekly Calendar - 3/4 width */}
        <div className="h-full">
          {loading ? (
            <Card className="p-8 flex-1">
              <p className="text-center text-muted-foreground">
                Loading configuration...
              </p>
            </Card>
          ) : (
            <WeeklyCalendar
              blocks={state.knownBlocks.map(block => ({
                ...block,
                id: block.id,
                name: block.name,
                type: block.type,
                start_time: block.start_time,
                duration: block.duration,
                category: block.category,
                days: block.days,
                description: block.description
              }))}
              onBlockClick={(block) => {
                // Find the original block and edit it
                const originalBlock = state.knownBlocks.find(b => b.id === block.id);
                if (originalBlock) {
                  openModal({ ...originalBlock }, undefined);
                }
              }}
              onBlockDelete={handleBlockDelete}
              onTimeSlotClick={(day, time) => {
                const newBlock = createNewBlock();
                newBlock.start_time = time;
                newBlock.days = [day];
                openModal(newBlock);
              }}
            />
          )}
        </div>

        {/* Reminders & Deadlines - 1/4 width */}
        <div className="h-full">
          <Card className="h-full bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <div>
                <CardTitle>Reminders & Deadlines</CardTitle>
                <CardDescription>
                  Bills, deadlines, and important dates
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {sortedReminders.length === 0 ? (
                <div className="text-center text-muted-foreground py-16">
                  <p className="text-sm">No reminders yet</p>
                  <p className="text-xs mt-2">Click "Add Reminder" above to create your first reminder.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sortedReminders.map(reminder => {
                    const urgency = getUrgencyLevel(reminder.due_date, reminder.recurrence);
                    const relativeTime = getRelativeTime(reminder.due_date, reminder.recurrence);
                    const recurrenceText = reminder.recurrence === 'none' ? '' : reminder.recurrence.charAt(0).toUpperCase() + reminder.recurrence.slice(1);
                    
                    return (
                      <div 
                        key={reminder.id} 
                        className={`group relative p-2.5 rounded-md cursor-pointer hover:shadow-sm transition-all duration-200 border-l-2 ${
                          reminder.is_completed ? 'opacity-60' : ''
                        } ${
                          urgency === 'overdue' ? 'border-l-red-500 bg-red-500/5 hover:bg-red-500/10' :
                          urgency === 'urgent' ? 'border-l-orange-500 bg-orange-500/5 hover:bg-orange-500/10' :
                          urgency === 'soon' ? 'border-l-accent bg-accent/5 hover:bg-accent/10' :
                          'border-l-border bg-card/30 hover:bg-card/50'
                        }`}
                        onClick={() => openModal(undefined, reminder)}
                      >
                        {/* Delete button - appears on hover */}
                        <button
                          className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-destructive p-1"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReminderDelete(reminder.id);
                          }}
                          title="Delete reminder"
                        >
                          <Trash2 size={12} />
                        </button>
                        
                        <div className="flex-1 pr-6">
                          {/* Line 1: Title */}
                          <h4 className={`text-sm leading-tight mb-0.5 font-medium ${
                            reminder.is_completed ? 'line-through' : ''
                          }`}>{reminder.name}</h4>
                          
                          {/* Line 2: Metadata - only show if there's meaningful info */}
                          {(relativeTime || recurrenceText) && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              {relativeTime && (
                                <span className={urgency === 'overdue' ? 'text-red-400' : urgency === 'urgent' ? 'text-orange-400' : ''}>
                                  {relativeTime}
                                </span>
                              )}
                              {relativeTime && recurrenceText && <span>•</span>}
                              {recurrenceText && <span className="capitalize">{recurrenceText}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal for Block or Reminder Editor */}
      {state.showModal && state.modalType === "block" && state.editingBlock && (
        <BlockEditorModal
          block={state.editingBlock}
          onSave={handleBlockSave}
          onCancel={closeModal}
        />
      )}
      
      {state.showModal && state.modalType === "reminder" && state.editingReminder && (
        <ReminderEditorModal
          reminder={state.editingReminder}
          onSave={handleReminderSave}
          onCancel={closeModal}
        />
      )}
    </div>
  );
}

interface BlockEditorModalProps {
  block: KnownBlock;
  onSave: (block: KnownBlock) => void;
  onCancel: () => void;
}

function BlockEditorModal({ block, onSave, onCancel }: BlockEditorModalProps) {
  // Ensure the block has a properly initialized recurrence object
  const initialBlock = {
    ...block,
    recurrence: block.recurrence || {
      type: "weekly" as const,
      days: block.days || ["monday", "tuesday", "wednesday", "thursday", "friday"]
    }
  };
  const [editBlock, setEditBlock] = useState<KnownBlock>(initialBlock);

  // Sync days with recurrence for backward compatibility
  const handleRecurrenceChange = (newRecurrence: Recurrence) => {
    let updatedDays: string[] = [];
    
    if (newRecurrence.type === "weekly" || newRecurrence.type === "bi-weekly") {
      updatedDays = newRecurrence.days || [];
    } else if (newRecurrence.type === "monthly") {
      // For monthly, we'll use a placeholder - in practice, this would be calculated
      updatedDays = ["monday"]; // Placeholder
    }
    
    setEditBlock(prev => ({
      ...prev,
      recurrence: newRecurrence,
      days: updatedDays
    }));
  };

  // const handleFlexPreferenceChange = (field: string, value: string) => {
  //   setEditBlock(prev => ({
  //     ...prev,
  //     [field]: value
  //   }));
  // };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-card border border-border rounded-lg p-0 w-[60%] max-w-4xl max-h-[80vh] overflow-y-auto">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>{editBlock.id.startsWith('new_') ? "New Block" : "Edit Block"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name">Block Name</Label>
          <Input
            id="name"
            value={editBlock.name}
            onChange={(e) => setEditBlock(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Morning Routine"
          />
        </div>

        <div>
          <Label htmlFor="type">Block Type</Label>
          <Select value={editBlock.type} onValueChange={(value: BlockType) => setEditBlock(prev => ({ ...prev, type: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BLOCK_TYPES.map(type => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Time fields - different for flex vs other types */}
        {editBlock.type === "flex" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="preferred_time">Preferred Time</Label>
              <Select 
                value={editBlock.start_time || "09:00"} 
                onValueChange={(value) => setEditBlock(prev => ({ ...prev, start_time: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select preferred time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning (6AM - 12PM)</SelectItem>
                  <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                  <SelectItem value="evening">Evening (5PM - 10PM)</SelectItem>
                  <SelectItem value="09:00">Specific time: 9:00 AM</SelectItem>
                  <SelectItem value="14:00">Specific time: 2:00 PM</SelectItem>
                  <SelectItem value="19:00">Specific time: 7:00 PM</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                The AI planner will try to schedule this block during your preferred time.
              </p>
            </div>
            
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={editBlock.duration}
                onChange={(e) => setEditBlock(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="constraints">Constraints (Optional)</Label>
              <Input
                id="constraints"
                placeholder="e.g., Must be done before 5 PM"
                value={editBlock.description || ""}
                onChange={(e) => setEditBlock(prev => ({ ...prev, description: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Any time constraints or preferences for this flexible block.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={editBlock.start_time}
                onChange={(e) => setEditBlock(prev => ({ ...prev, start_time: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                step="15"
                value={editBlock.duration}
                onChange={(e) => setEditBlock(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={editBlock.category} onValueChange={(value) => setEditBlock(prev => ({ ...prev, category: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recurrence Pattern */}
        <RecurrenceSelector
          recurrence={editBlock.recurrence}
          onChange={handleRecurrenceChange}
        />

        {/* Description - only show for non-flex blocks */}
        {editBlock.type !== "flex" && (
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={editBlock.description || ""}
              onChange={(e) => setEditBlock(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Additional details about this block..."
              rows={2}
            />
          </div>
        )}

        <div className="flex flex-col gap-2">
          {/* Validation messages */}
          {(() => {
            const errors = [];
            if (!editBlock.name.trim()) errors.push("Block name is required.");
            
            if (editBlock.recurrence.type === "weekly" || editBlock.recurrence.type === "bi-weekly") {
              if (!editBlock.recurrence.days || editBlock.recurrence.days.length === 0) {
                errors.push("At least one day must be selected.");
              }
            }
            
            if (editBlock.recurrence.type === "monthly") {
              if (editBlock.recurrence.monthlyType === "date" && !editBlock.recurrence.monthlyDate) {
                errors.push("Monthly date is required.");
              }
              if (editBlock.recurrence.monthlyType === "weekday" && (!editBlock.recurrence.monthlyWeek || !editBlock.recurrence.monthlyWeekday)) {
                errors.push("Monthly weekday pattern is required.");
              }
            }
            
            return errors.length > 0 && (
              <p className="text-sm text-red-500">
                {errors.join(" ")}
              </p>
            );
          })()}
          
          <div className="flex gap-2">
            <Button 
              variant="default"
              className="border border-accent"
              onClick={() => {
                console.log('Save button clicked with block:', editBlock);
                onSave(editBlock);
              }} 
              disabled={!editBlock.name.trim() || editBlock.days.length === 0}
            >
              Save Block
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface ReminderEditorModalProps {
  reminder: Reminder;
  onSave: (reminder: Reminder) => void;
  onCancel: () => void;
}

function ReminderEditorModal({ reminder, onSave, onCancel }: ReminderEditorModalProps) {
  const [editReminder, setEditReminder] = useState<Reminder>(reminder);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-card border border-border rounded-lg p-0 w-[60%] max-w-4xl max-h-[80vh] overflow-y-auto">
        <Card className="border-none shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle>{editReminder.id.startsWith('new_reminder_') ? "New Reminder" : "Edit Reminder"}</CardTitle>
              <Button variant="ghost" size="sm" onClick={onCancel}>
                ✕
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Reminder Name</Label>
              <Input
                id="name"
                value={editReminder.name}
                onChange={(e) => setEditReminder(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Pay Electric Bill"
              />
            </div>

            <div>
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={editReminder.due_date}
                onChange={(e) => setEditReminder(prev => ({ ...prev, due_date: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="recurrence">Recurrence</Label>
              <Select value={editReminder.recurrence} onValueChange={(value: "none" | "weekly" | "monthly" | "yearly") => setEditReminder(prev => ({ ...prev, recurrence: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Does not repeat</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={editReminder.category} onValueChange={(value) => setEditReminder(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={editReminder.description || ""}
                onChange={(e) => setEditReminder(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Additional details about this reminder..."
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-2">
              {!editReminder.name.trim() && (
                <p className="text-sm text-red-500">
                  Reminder name is required.
                </p>
              )}
              
              <div className="flex gap-2">
                <Button 
                  variant="default"
                  className="border border-accent"
                  onClick={() => {
                    console.log('Save reminder clicked with:', editReminder);
                    onSave(editReminder);
                  }} 
                  disabled={!editReminder.name.trim()}
                >
                  Save Reminder
                </Button>
                <Button variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}