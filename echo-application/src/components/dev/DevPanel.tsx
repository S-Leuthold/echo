/**
 * Development Panel Component
 * 
 * Floating panel for development controls and feature toggles.
 * Only visible in development mode.
 */

"use client";

import { useState } from 'react';
import { useDevMode } from '@/config/devMode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Settings, 
  X, 
  Database, 
  Wifi, 
  Eye,
  RefreshCw,
  Beaker,
  ChevronRight,
  ChevronDown
} from 'lucide-react';

export const DevPanel: React.FC = () => {
  const { config, updateConfig, isDevelopment, reset } = useDevMode();
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>('data');

  // Don't render in production
  if (!isDevelopment()) {
    return null;
  }

  const toggleSection = (section: string) => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleToggle = (key: keyof typeof config) => {
    updateConfig({ [key]: !config[key] });
  };

  return (
    <>
      {/* Toggle Button */}
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant="outline"
          size="sm"
          className="bg-orange-500 text-white border-orange-600 hover:bg-orange-600 shadow-lg"
        >
          <Beaker className="w-4 h-4 mr-2" />
          Dev
        </Button>
      </div>

      {/* Dev Panel */}
      {isOpen && (
        <div className="fixed bottom-16 left-4 z-50 w-80">
          <Card className="border-orange-200 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Development Panel
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="h-6 w-6 p-0"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {config.environment}
                </Badge>
                <Badge 
                  variant={config.useMockData ? "default" : "outline"}
                  className="text-xs"
                >
                  {config.useMockData ? 'Mock Data' : 'Real API'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Data Source Controls */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleSection('data')}
                  className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-accent-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-3 h-3" />
                    Data Source
                  </span>
                  {activeSection === 'data' ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                {activeSection === 'data' && (
                  <div className="space-y-2 ml-5 border-l border-border pl-3">
                    <label className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <Database className="w-3 h-3" />
                        Use Mock Data
                      </span>
                      <input
                        type="checkbox"
                        checked={config.useMockData}
                        onChange={() => handleToggle('useMockData')}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2">
                        <Wifi className="w-3 h-3" />
                        Use Real API
                      </span>
                      <input
                        type="checkbox"
                        checked={config.useRealAPI}
                        onChange={() => handleToggle('useRealAPI')}
                        className="rounded"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Feature Flags */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleSection('features')}
                  className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-accent-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Eye className="w-3 h-3" />
                    Phase 2 Features
                  </span>
                  {activeSection === 'features' ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                {activeSection === 'features' && (
                  <div className="space-y-2 ml-5 border-l border-border pl-3">
                    <label className="flex items-center justify-between text-xs">
                      <span>Project Wizard</span>
                      <input
                        type="checkbox"
                        checked={config.enableProjectWizard}
                        onChange={() => handleToggle('enableProjectWizard')}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs">
                      <span>Project Details</span>
                      <input
                        type="checkbox"
                        checked={config.enableProjectDetails}
                        onChange={() => handleToggle('enableProjectDetails')}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs">
                      <span>Session Linking</span>
                      <input
                        type="checkbox"
                        checked={config.enableSessionLinking}
                        onChange={() => handleToggle('enableSessionLinking')}
                        className="rounded"
                      />
                    </label>
                    <label className="flex items-center justify-between text-xs">
                      <span>Weekly Synthesis</span>
                      <input
                        type="checkbox"
                        checked={config.enableWeeklySynthesis}
                        onChange={() => handleToggle('enableWeeklySynthesis')}
                        className="rounded"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Debug Controls */}
              <div className="space-y-2">
                <button
                  onClick={() => toggleSection('debug')}
                  className="flex items-center justify-between w-full text-sm font-medium text-foreground hover:text-accent-foreground"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-3 h-3" />
                    Debug
                  </span>
                  {activeSection === 'debug' ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                </button>

                {activeSection === 'debug' && (
                  <div className="space-y-2 ml-5 border-l border-border pl-3">
                    <label className="flex items-center justify-between text-xs">
                      <span>Show Debug Info</span>
                      <input
                        type="checkbox"
                        checked={config.showDebugInfo}
                        onChange={() => handleToggle('showDebugInfo')}
                        className="rounded"
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-2 border-t border-border">
                <Button
                  onClick={reset}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Reset to Defaults
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
};