/**
 * useFileUploads Hook
 * 
 * Extracted file upload management logic from useHybridProjectState.
 * Handles secure file upload processing, validation, and integration.
 * 
 * Phase 4 of hybrid wizard refactoring - security-focused separation.
 */

import { useState, useCallback } from 'react';
import { UploadedFile } from '@/components/projects/FileUploadZone';

/**
 * Configuration for file upload behavior
 */
export interface FileUploadsConfig {
  /** Maximum file size in bytes (default: 10MB) */
  maxFileSize: number;
  /** Allowed file types (MIME types) */
  allowedTypes: string[];
  /** Maximum number of files */
  maxFiles: number;
  /** Enable virus scanning simulation */
  enableSecurityScanning: boolean;
}

/**
 * File upload state
 */
export interface FileUploadsState {
  /** Currently uploaded files */
  files: UploadedFile[];
  /** Upload progress for active uploads */
  uploadProgress: Record<string, number>;
  /** Upload errors */
  uploadErrors: Record<string, string>;
  /** Whether any upload is in progress */
  isUploading: boolean;
}

/**
 * Return type for the useFileUploads hook
 */
export interface UseFileUploadsReturn {
  // State
  state: FileUploadsState;
  
  // Actions
  uploadFiles: (files: File[]) => Promise<UploadedFile[]>;
  removeFile: (fileId: string) => void;
  clearAllFiles: () => void;
  validateFile: (file: File) => { isValid: boolean; error?: string };
  
  // Security
  scanFileForThreats: (file: File) => Promise<{ isSafe: boolean; threats?: string[] }>;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: FileUploadsConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [
    'text/plain',
    'text/markdown', 
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/json',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  maxFiles: 10,
  enableSecurityScanning: true
};

/**
 * Creates initial file uploads state
 */
function createInitialState(): FileUploadsState {
  return {
    files: [],
    uploadProgress: {},
    uploadErrors: {},
    isUploading: false
  };
}

/**
 * File uploads management hook with security layer
 */
export const useFileUploads = (
  config: Partial<FileUploadsConfig> = {}
): UseFileUploadsReturn => {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  // File uploads state
  const [state, setState] = useState<FileUploadsState>(createInitialState);

  /**
   * Validates a file against security and size constraints
   */
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // Check file size
    if (file.size > fullConfig.maxFileSize) {
      return {
        isValid: false,
        error: `File size exceeds ${Math.round(fullConfig.maxFileSize / 1024 / 1024)}MB limit`
      };
    }

    // Check file type
    if (!fullConfig.allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed`
      };
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /\.exe$/i,
      /\.bat$/i,
      /\.cmd$/i,
      /\.scr$/i,
      /\.vbs$/i,
      /\.js$/i,
      /\.jar$/i,
      /\.\./,  // Path traversal
      /[<>:"|?*]/  // Invalid characters
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(file.name))) {
      return {
        isValid: false,
        error: 'File name contains potentially unsafe characters or extensions'
      };
    }

    return { isValid: true };
  }, [fullConfig.maxFileSize, fullConfig.allowedTypes]);

  /**
   * Simulates security scanning for uploaded files
   */
  const scanFileForThreats = useCallback(async (file: File): Promise<{ isSafe: boolean; threats?: string[] }> => {
    if (!fullConfig.enableSecurityScanning) {
      return { isSafe: true };
    }

    // Simulate security scanning delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Basic threat detection simulation
    const threats: string[] = [];
    
    // Check for suspicious content patterns (basic simulation)
    if (file.name.toLowerCase().includes('virus') || 
        file.name.toLowerCase().includes('malware')) {
      threats.push('Suspicious filename detected');
    }

    // Simulate file content scanning based on size patterns
    if (file.size < 100) {
      threats.push('File too small - potential fragment');
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB
      threats.push('File unusually large for type');
    }

    return {
      isSafe: threats.length === 0,
      threats: threats.length > 0 ? threats : undefined
    };
  }, [fullConfig.enableSecurityScanning]);

  /**
   * Uploads files with validation and security scanning
   */
  const uploadFiles = useCallback(async (files: File[]): Promise<UploadedFile[]> => {
    // Check file count limit
    if (state.files.length + files.length > fullConfig.maxFiles) {
      throw new Error(`Cannot upload more than ${fullConfig.maxFiles} files`);
    }

    setState(prev => ({ ...prev, isUploading: true }));

    const uploadedFiles: UploadedFile[] = [];
    const newUploadProgress: Record<string, number> = {};
    const newUploadErrors: Record<string, string> = {};

    try {
      for (const file of files) {
        const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        try {
          // Validate file
          const validation = validateFile(file);
          if (!validation.isValid) {
            newUploadErrors[fileId] = validation.error!;
            continue;
          }

          // Security scanning
          newUploadProgress[fileId] = 25;
          setState(prev => ({ 
            ...prev, 
            uploadProgress: { ...prev.uploadProgress, ...newUploadProgress }
          }));

          const scanResult = await scanFileForThreats(file);
          if (!scanResult.isSafe) {
            newUploadErrors[fileId] = `Security threats detected: ${scanResult.threats?.join(', ')}`;
            continue;
          }

          // Simulate file processing
          newUploadProgress[fileId] = 50;
          setState(prev => ({ 
            ...prev, 
            uploadProgress: { ...prev.uploadProgress, ...newUploadProgress }
          }));

          // Read file content (for text files)
          let content: string | null = null;
          if (file.type.startsWith('text/') || file.type === 'application/json') {
            content = await file.text();
          }

          newUploadProgress[fileId] = 75;
          setState(prev => ({ 
            ...prev, 
            uploadProgress: { ...prev.uploadProgress, ...newUploadProgress }
          }));

          // Create uploaded file object
          const uploadedFile: UploadedFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            content,
            uploaded_at: new Date(),
            is_processing: false
          };

          uploadedFiles.push(uploadedFile);
          newUploadProgress[fileId] = 100;

        } catch (error) {
          console.error(`Upload failed for ${file.name}:`, error);
          newUploadErrors[fileId] = `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }

      // Update state with successful uploads
      setState(prev => ({
        ...prev,
        files: [...prev.files, ...uploadedFiles],
        uploadProgress: { ...prev.uploadProgress, ...newUploadProgress },
        uploadErrors: { ...prev.uploadErrors, ...newUploadErrors },
        isUploading: false
      }));

      return uploadedFiles;

    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isUploading: false,
        uploadErrors: { 
          ...prev.uploadErrors, 
          general: error instanceof Error ? error.message : 'Upload failed'
        }
      }));
      throw error;
    }
  }, [state.files.length, fullConfig.maxFiles, validateFile, scanFileForThreats]);

  /**
   * Removes a file from the uploaded files list
   */
  const removeFile = useCallback((fileId: string) => {
    setState(prev => ({
      ...prev,
      files: prev.files.filter(file => file.id !== fileId),
      uploadProgress: Object.fromEntries(
        Object.entries(prev.uploadProgress).filter(([id]) => id !== fileId)
      ),
      uploadErrors: Object.fromEntries(
        Object.entries(prev.uploadErrors).filter(([id]) => id !== fileId)
      )
    }));
  }, []);

  /**
   * Clears all uploaded files and resets state
   */
  const clearAllFiles = useCallback(() => {
    setState(createInitialState());
  }, []);

  return {
    state,
    uploadFiles,
    removeFile,
    clearAllFiles,
    validateFile,
    scanFileForThreats
  };
};