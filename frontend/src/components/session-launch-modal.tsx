"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, Mail, AlertCircle, Play, X } from "lucide-react";

interface SessionContext {
  block_id: string;
  block_label: string;
  momentum_context: string;
  email_pressure: string[];
  suggested_tasks: string[];
  project_state: string;
  confidence: number;
  estimated_complexity: string;
}

interface SessionLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartSession: (sessionData: SessionLaunchData) => void;
  blockData: {
    id: string;
    startTime: string;
    endTime: string;
    label: string;
    timeCategory: string;
    duration: string;
  };
  sessionContext?: SessionContext;
}

interface SessionLaunchData {
  objectives: string;
  additionalNotes: string;
  blockId: string;
  startTime: string;
}

export function SessionLaunchModal({
  isOpen,
  onClose,
  onStartSession,
  blockData,
  sessionContext
}: SessionLaunchModalProps) {
  const [objectives, setObjectives] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const handleStartSession = async () => {
    if (!objectives.trim()) return;
    
    setIsStarting(true);
    
    const sessionData: SessionLaunchData = {
      objectives: objectives.trim(),
      additionalNotes: additionalNotes.trim(),
      blockId: blockData.id,
      startTime: new Date().toISOString()
    };
    
    await onStartSession(sessionData);
    setIsStarting(false);
    
    // Reset form
    setObjectives("");
    setAdditionalNotes("");
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Play className="w-5 h-5 text-accent" />
              <DialogTitle className="text-xl">Start Session</DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <DialogDescription>
            Set your objectives and context for this focused work session.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Block Context */}
          <div className="p-4 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">{blockData.label}</h3>
              <Badge variant="outline" className="text-xs">
                {blockData.timeCategory.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatTime(blockData.startTime)} - {formatTime(blockData.endTime)}</span>
              </div>
              <span>•</span>
              <span>{blockData.duration}</span>
            </div>
          </div>

          {/* AI-Generated Context */}
          {sessionContext && (
            <div className="space-y-4">
              {/* Momentum Context */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">Project Momentum</h4>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
                  {sessionContext.momentum_context}
                </p>
              </div>

              {/* Email Pressure Points */}
              {sessionContext.email_pressure.length > 0 && (
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/30">
                  <div className="flex items-center space-x-2 mb-3">
                    <Mail className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <h4 className="font-medium text-orange-900 dark:text-orange-100">Email Context</h4>
                  </div>
                  <ul className="space-y-1">
                    {sessionContext.email_pressure.map((item, index) => (
                      <li key={index} className="text-sm text-orange-800 dark:text-orange-200 flex items-start space-x-2">
                        <span className="text-orange-600 dark:text-orange-400 mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Tasks */}
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <h4 className="font-medium text-green-900 dark:text-green-100">Suggested Tasks</h4>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-muted-foreground">Complexity:</span>
                    <span className={`text-xs font-medium ${getComplexityColor(sessionContext.estimated_complexity)}`}>
                      {sessionContext.estimated_complexity}
                    </span>
                  </div>
                </div>
                <ul className="space-y-1">
                  {sessionContext.suggested_tasks.map((task, index) => (
                    <li key={index} className="text-sm text-green-800 dark:text-green-200 flex items-start space-x-2">
                      <span className="text-green-600 dark:text-green-400 mt-1">•</span>
                      <span>{task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* User Input */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="objectives" className="text-base font-medium">
                What needs to get done during this session? *
              </Label>
              <Input
                id="objectives"
                value={objectives}
                onChange={(e) => setObjectives(e.target.value)}
                placeholder="Enter your main objectives for this session..."
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="notes" className="text-base font-medium">
                Additional notes or context
              </Label>
              <Textarea
                id="notes"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any additional thoughts, ideas, or context for this session..."
                className="mt-2 min-h-[100px]"
                rows={4}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t border-border/50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleStartSession}
              disabled={!objectives.trim() || isStarting}
              className="min-w-[120px]"
            >
              {isStarting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Session
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}