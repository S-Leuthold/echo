"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type BlockType = "anchor" | "fixed" | "flex";

interface KnownBlock {
  id: string;
  name: string;
  type: BlockType;
  start_time: string;
  duration: number; // in minutes
  category: string;
  description?: string;
  days: string[]; // Which days of the week this applies to
}

interface ConfigWizardState {
  step: number;
  knownBlocks: KnownBlock[];
  editingBlock: KnownBlock | null;
}

const DAYS_OF_WEEK = [
  "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"
];

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
    id: Date.now().toString(),
    name: "",
    type: "anchor",
    start_time: "09:00",
    duration: 60,
    category: "Personal",
    description: "",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday"]
  });

  const handleBlockSave = (block: KnownBlock) => {
    setState(prev => ({
      ...prev,
      knownBlocks: prev.editingBlock 
        ? prev.knownBlocks.map(b => b.id === block.id ? block : b)
        : [...prev.knownBlocks, block],
      editingBlock: null
    }));
  };

  const handleBlockDelete = (blockId: string) => {
    setState(prev => ({
      ...prev,
      knownBlocks: prev.knownBlocks.filter(b => b.id !== blockId)
    }));
  };

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

  const addMinutes = (timeStr: string, minutes: number): string => {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  };

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
                <h3 className="text-lg font-semibold mb-4">Block Types</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  {BLOCK_TYPES.map(type => (
                    <Card key={type.value} className="p-4">
                      <h4 className="font-medium text-sm">{type.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                    </Card>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button onClick={() => setState(prev => ({ ...prev, step: 2 }))}>
                  Start Building Schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6">
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Known Blocks List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Known Blocks ({state.knownBlocks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-center text-muted-foreground py-8">
                  Loading configuration...
                </p>
              ) : state.knownBlocks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No blocks configured yet. Add your first block to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {state.knownBlocks.map(block => (
                    <Card key={block.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{block.name}</h4>
                            <Badge variant={block.type === 'anchor' ? 'default' : block.type === 'fixed' ? 'destructive' : 'secondary'}>
                              {block.type}
                            </Badge>
                            <Badge variant="outline">{block.category}</Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <p>{block.start_time} - {addMinutes(block.start_time, block.duration)} ({block.duration} min)</p>
                            <p>Days: {block.days.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(", ")}</p>
                            {block.description && <p className="italic">{block.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setState(prev => ({ ...prev, editingBlock: { ...block } }))}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleBlockDelete(block.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Block Editor */}
        {state.editingBlock && (
          <BlockEditor
            block={state.editingBlock}
            onSave={handleBlockSave}
            onCancel={() => setState(prev => ({ ...prev, editingBlock: null }))}
          />
        )}
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

  const handleDayToggle = (day: string) => {
    setEditBlock(prev => ({
      ...prev,
      days: prev.days.includes(day) 
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day]
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editBlock.id === Date.now().toString() ? "New Block" : "Edit Block"}</CardTitle>
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

        <div>
          <Label>Days of Week</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayToggle(day)}
                className={`px-3 py-1 text-xs rounded-full border ${
                  editBlock.days.includes(day)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-accent"
                }`}
              >
                {day.charAt(0).toUpperCase() + day.slice(1, 3)}
              </button>
            ))}
          </div>
        </div>

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

        <div className="flex gap-2">
          <Button 
            onClick={() => onSave(editBlock)} 
            disabled={!editBlock.name.trim() || editBlock.days.length === 0}
          >
            Save Block
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}