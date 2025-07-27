"use client";

import React from 'react';
import { 
  DynamicText, 
  TimeAwareText, 
  PlanningModeBadge, 
  TimeContextDisplay,
  ConditionalPlanningContent,
  PlanningModeToggle 
} from '@/components/ui/dynamic-text';
import { usePlanning } from '@/contexts/PlanningContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Demo component showing all Planning Context features
 * This can be removed once integrated into actual components
 */
export function PlanningModeDemo() {
  const { 
    planningMode, 
    timeContext, 
    planningModeSource,
    shouldSuggestSameDay,
    canPlanToday 
  } = usePlanning();

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Planning Context Demo
            <PlanningModeBadge />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time Context Display */}
          <div>
            <h3 className="font-semibold mb-2">Time Context</h3>
            <TimeContextDisplay className="bg-gray-50 p-3 rounded" />
            <div className="mt-2 text-xs text-gray-500">
              Source: {planningModeSource} | Can plan today: {canPlanToday ? 'Yes' : 'No'} | Should suggest same-day: {shouldSuggestSameDay ? 'Yes' : 'No'}
            </div>
          </div>

          {/* Dynamic Text Examples */}
          <div>
            <h3 className="font-semibold mb-2">Dynamic Copy Examples</h3>
            <div className="space-y-2 bg-gray-50 p-3 rounded">
              <p>
                <DynamicText>Let's plan your tomorrow!</DynamicText>
              </p>
              <p>
                <DynamicText todayText="Let's plan your remaining day!">
                  What do you want to accomplish tomorrow?
                </DynamicText>
              </p>
              <p>
                <DynamicText>Your tomorrow's schedule will be optimized for peak performance.</DynamicText>
              </p>
            </div>
          </div>

          {/* Time-Aware Copy Examples */}
          <div>
            <h3 className="font-semibold mb-2">Time-Aware Copy Examples</h3>
            <div className="space-y-2 bg-gray-50 p-3 rounded">
              <p>
                <TimeAwareText
                  morning="Start your day with intention"
                  afternoon="Make the most of your afternoon"
                  evening="Wind down with purpose"
                  night="Planning for tomorrow while you reflect on today"
                  default="Let's create your perfect schedule"
                />
              </p>
              <p>
                <TimeAwareText
                  morning="☀️ Morning energy is perfect for deep work"
                  afternoon="🌅 Afternoon focus for getting things done"
                  evening="🌆 Evening is ideal for planning and reflection"
                  night="🌙 Late night planning for early birds"
                  default="Any time is a good time to plan"
                />
              </p>
            </div>
          </div>

          {/* Conditional Content Examples */}
          <div>
            <h3 className="font-semibold mb-2">Conditional Content</h3>
            <div className="space-y-2 bg-gray-50 p-3 rounded">
              <ConditionalPlanningContent mode="today">
                <div className="p-2 bg-orange-100 rounded text-orange-800">
                  ⚡ Same-day planning mode: Focus on what you can accomplish in the remaining time.
                </div>
              </ConditionalPlanningContent>
              
              <ConditionalPlanningContent mode="tomorrow">
                <div className="p-2 bg-blue-100 rounded text-blue-800">
                  📅 Tomorrow planning mode: Think strategically about your entire next day.
                </div>
              </ConditionalPlanningContent>
              
              <ConditionalPlanningContent mode="both">
                <div className="p-2 bg-green-100 rounded text-green-800">
                  ✨ This content shows for both planning modes.
                </div>
              </ConditionalPlanningContent>
            </div>
          </div>

          {/* Planning Mode Toggle */}
          <div>
            <h3 className="font-semibold mb-2">Mode Toggle</h3>
            <div className="flex gap-2">
              <PlanningModeToggle size="sm" />
              <PlanningModeToggle size="md" />
              <PlanningModeToggle size="lg" />
            </div>
          </div>

          {/* Raw Context Data */}
          <div>
            <h3 className="font-semibold mb-2">Raw Context Data</h3>
            <details className="bg-gray-50 p-3 rounded">
              <summary className="cursor-pointer text-sm text-gray-600">
                Show timeContext data
              </summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(timeContext, null, 2)}
              </pre>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}