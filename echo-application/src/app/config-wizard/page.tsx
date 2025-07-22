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

interface ConfigWizardState {
  step: number;
  knownBlocks: KnownBlock[];
  editingBlock: KnownBlock | null;
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
    step: 1,
    knownBlocks: [],
    editingBlock: null
  });
  const [loading, setLoading] = useState(false);

  // Load existing configuration on component mount
  useEffect(() => {
    const loadExistingConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/config/load');
        const result = await response.json();
        
        if (response.ok && result.known_blocks) {
          setState(prev => ({
            ...prev,
            knownBlocks: result.known_blocks
          }));
        }
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

  const handleBlockSave = (block: KnownBlock) => {
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
        editingBlock: null
      };
    });
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

  if (state.step === 1) {
    return (
      <div className="container max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Echo Configuration Wizard</CardTitle>
            <CardDescription>
              Build your weekly schedule with known blocks - recurring time slots that define your routine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Choose a Block Type to Get Started</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {BLOCK_TYPES.map(type => (
                    <Card 
                      key={type.value} 
                      className="p-4 cursor-pointer hover:border-primary hover:shadow-md transition-all duration-200"
                      onClick={() => {
                        const newBlock = createNewBlock();
                        newBlock.type = type.value;
                        setState(prev => ({ 
                          ...prev, 
                          step: 2,
                          editingBlock: newBlock
                        }));
                      }}
                    >
                      <h4 className="font-medium text-sm">{type.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                      <div className="mt-2 flex justify-end">
                        <span className="text-xs text-primary">Click to create →</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-full mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Known Blocks Configuration</h1>
          <p className="text-muted-foreground">Manage your recurring schedule blocks</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setState(prev => ({ ...prev, editingBlock: createNewBlock() }))}>
            Add New Block
          </Button>
          <Button onClick={handleExportConfig} disabled={state.knownBlocks.length === 0 || loading}>
            {loading ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Left Panel - Block Editor */}
        <div className="lg:col-span-1">
          {state.editingBlock ? (
            <BlockEditor
              block={state.editingBlock}
              onSave={handleBlockSave}
              onCancel={() => setState(prev => ({ ...prev, editingBlock: null }))}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Block Editor</CardTitle>
                <CardDescription>
                  Click &ldquo;Add New Block&rdquo; above or click on a time slot in the calendar to create a new block.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    <p><strong>{state.knownBlocks.length}</strong> blocks configured</p>
                  </div>
                  
                  {state.knownBlocks.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Quick Actions:</h4>
                      <div className="space-y-1">
                        {state.knownBlocks.slice(0, 3).map(block => (
                          <button
                            key={block.id}
                            onClick={() => setState(prev => ({ ...prev, editingBlock: { ...block } }))}
                            className="w-full text-left text-xs p-2 rounded hover:bg-accent transition-colors"
                          >
                            Edit &ldquo;{block.name}&rdquo;
                          </button>
                        ))}
                        {state.knownBlocks.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{state.knownBlocks.length - 3} more blocks
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Area - Weekly Calendar */}
        <div className="lg:col-span-3">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Weekly Calendar View</CardTitle>
                <CardDescription>
                  Your recurring blocks visualized across the week. Click on blocks to edit them or on empty time slots to create new ones.
                </CardDescription>
              </CardHeader>
            </Card>
            
            {loading ? (
              <Card className="p-8">
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
                    setState(prev => ({ ...prev, editingBlock: { ...originalBlock } }));
                  }
                }}
                onTimeSlotClick={(day, time) => {
                  const newBlock = createNewBlock();
                  newBlock.start_time = time;
                  newBlock.days = [day];
                  setState(prev => ({ ...prev, editingBlock: newBlock }));
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface BlockEditorProps {
  block: KnownBlock;
  onSave: (block: KnownBlock) => void;
  onCancel: () => void;
}

function BlockEditor({ block, onSave, onCancel }: BlockEditorProps) {
  const [editBlock, setEditBlock] = useState<KnownBlock>(block);

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
    <Card>
      <CardHeader>
        <CardTitle>{editBlock.id.startsWith('new_') ? "New Block" : "Edit Block"}</CardTitle>
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
  );
}