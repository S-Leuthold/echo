/**
 * Development Mode Configuration
 * 
 * Centralized configuration for development toggles and feature flags.
 * Enables clean switching between mock data, API calls, and feature states.
 */

export interface DevModeConfig {
  // Data source controls
  useMockData: boolean;
  useRealAPI: boolean;
  
  // Feature flags
  enableProjectWizard: boolean;
  enableProjectDetails: boolean;
  enableSessionLinking: boolean;
  enableWeeklySynthesis: boolean;
  
  // Debug controls
  showDebugInfo: boolean;
  enableDevPanel: boolean;
  
  // Environment info
  environment: 'development' | 'staging' | 'production';
}

// Default development configuration
const DEFAULT_DEV_CONFIG: DevModeConfig = {
  // Default to real API since backend is now ready
  useMockData: false,
  useRealAPI: true,
  
  // Phase 1 features enabled, Phase 2 features controlled
  enableProjectWizard: true, // Wizard is now ready
  enableProjectDetails: true, // Detail modal is now ready
  enableSessionLinking: false,
  enableWeeklySynthesis: false,
  
  // Debug features for development
  showDebugInfo: process.env.NODE_ENV === 'development',
  enableDevPanel: process.env.NODE_ENV === 'development',
  
  // Environment detection
  environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development'
};

// Configuration state management
class DevModeManager {
  private config: DevModeConfig;
  private listeners: Array<(config: DevModeConfig) => void> = [];

  constructor() {
    // Load from localStorage if available, otherwise use defaults
    this.config = this.loadConfig();
  }

  private loadConfig(): DevModeConfig {
    if (typeof window === 'undefined') {
      return DEFAULT_DEV_CONFIG;
    }

    try {
      const stored = localStorage.getItem('echo-dev-config');
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...DEFAULT_DEV_CONFIG, ...parsed };
      }
    } catch (error) {
      console.warn('Failed to load dev config from localStorage:', error);
    }

    return DEFAULT_DEV_CONFIG;
  }

  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('echo-dev-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save dev config to localStorage:', error);
    }
  }

  // Get current configuration
  getConfig(): DevModeConfig {
    return { ...this.config };
  }

  // Update configuration
  updateConfig(updates: Partial<DevModeConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
    this.notifyListeners();
  }

  // Subscribe to configuration changes
  subscribe(listener: (config: DevModeConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getConfig());
      } catch (error) {
        console.error('Error in dev config listener:', error);
      }
    });
  }

  // Utility methods for common checks
  isFeatureEnabled(feature: keyof DevModeConfig): boolean {
    return Boolean(this.config[feature]);
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  // Reset to defaults
  reset(): void {
    this.config = { ...DEFAULT_DEV_CONFIG };
    this.saveConfig();
    this.notifyListeners();
  }
}

// Export singleton instance
export const devMode = new DevModeManager();

// Convenience exports
export const getDevConfig = () => devMode.getConfig();
export const updateDevConfig = (updates: Partial<DevModeConfig>) => devMode.updateConfig(updates);
export const isFeatureEnabled = (feature: keyof DevModeConfig) => devMode.isFeatureEnabled(feature);
export const isDevelopment = () => devMode.isDevelopment();

// Hook for React components
export const useDevMode = () => {
  const [config, setConfig] = React.useState(devMode.getConfig());

  React.useEffect(() => {
    const unsubscribe = devMode.subscribe(setConfig);
    return unsubscribe;
  }, []);

  return {
    config,
    updateConfig: devMode.updateConfig.bind(devMode),
    isFeatureEnabled: devMode.isFeatureEnabled.bind(devMode),
    isDevelopment: devMode.isDevelopment.bind(devMode),
    reset: devMode.reset.bind(devMode)
  };
};

// We need to import React for the hook
import React from 'react';