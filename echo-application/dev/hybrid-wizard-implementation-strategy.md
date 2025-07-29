# Hybrid Wizard Implementation Strategy

## Executive Summary

This document outlines the comprehensive implementation strategy for completing the Echo Hybrid Project Creation Wizard. Following an extensive refactoring that transformed a 639-line monolithic hook into a clean, testable architecture, this guide provides the roadmap for backend integration and production readiness.

## Table of Contents

1. [Architectural Best Practices](#architectural-best-practices)
2. [Current State Assessment](#current-state-assessment)
3. [Backend Integration Strategy](#backend-integration-strategy)
4. [Implementation Phases](#implementation-phases)
5. [Testing Strategy](#testing-strategy)
6. [Security Considerations](#security-considerations)
7. [Performance Optimization](#performance-optimization)
8. [Deployment Strategy](#deployment-strategy)

## Architectural Best Practices

### Core Principles Applied During Refactoring

1. **Single Responsibility Principle**
   - Each hook manages exactly one aspect of state
   - No hook exceeds 350 lines of code
   - Clear separation of concerns

2. **Composition Over Inheritance**
   - Master hook orchestrates child hooks without duplicating state
   - Direct state composition eliminates synchronization issues
   - Each hook is independently testable

3. **Dependency Injection**
   - Services passed as configuration objects
   - Mock-friendly architecture for testing
   - No hard dependencies on external services

4. **Type Safety**
   - Full TypeScript coverage with strict mode
   - Discriminated unions for state variants
   - No implicit any types in core logic

5. **React Best Practices**
   - Proper useCallback dependencies
   - No unnecessary re-renders
   - Memoization only where measured as beneficial
   - Clean useEffect usage with proper cleanup

### Architecture Overview

```
HybridProjectCreator (Component)
  └── useHybridProjectState (Orchestrator Hook)
      ├── useConversation (232 lines)
      │   └── Manages chat messages and AI analysis
      ├── useBriefState (258 lines)
      │   └── Manages project brief and roadmap
      ├── useFileUploads (314 lines)
      │   └── Handles file validation and security
      ├── useWizardFlow (295 lines)
      │   └── Controls wizard phases and AI responses
      └── Services (Abstracted)
          ├── HybridProjectParser
          ├── RoadmapGenerationService
          ├── ResponseTriggerAnalyzer
          └── WizardOrchestrationService
```

## Current State Assessment

### ✅ Completed Work

1. **Architecture Refactoring**
   - Extracted 5 focused hooks from monolithic state
   - Implemented orchestrator pattern
   - Fixed infinite re-render loops
   - 35 tests passing

2. **UI Implementation**
   - Split-pane conversational interface
   - Live project brief with real-time updates
   - Click-to-edit functionality for all fields
   - File upload with security validation

3. **State Management**
   - Proper composition without duplication
   - Stable callback references
   - Optimized re-render performance

### 🐛 Known Issues

1. **Test Coverage Gaps**
   - Several test files excluded from Jest config
   - No integration tests for complete flow
   - Missing error boundary tests

2. **Type Safety Issues**
   - Some services use `any` types
   - Response interfaces could be stricter

3. **Missing Features**
   - No draft persistence
   - No real-time collaboration
   - Limited error recovery

## Backend Integration Strategy

### API Endpoints Required

#### 1. Conversation Analysis Endpoint
```typescript
POST /api/projects/analyze-conversation
Request: {
  message: string;
  conversation_history: ConversationMessage[];
  uploaded_files?: UploadedFile[];
  current_analysis?: ConversationAnalysis;
}
Response: {
  analysis: ConversationAnalysis;
  suggested_brief_updates: Partial<BriefState>;
}
```

**Implementation Notes:**
- Use Claude Opus 4 for strategic analysis
- Stream response for better UX
- Cache analysis results for 5 minutes
- Rate limit: 10 requests per minute per user

#### 2. Roadmap Generation Endpoint
```typescript
POST /api/projects/generate-roadmap
Request: {
  brief: BriefState;
  project_type: ProjectType;
  estimated_duration?: number;
}
Response: {
  roadmap: ProjectRoadmap;
  confidence: number;
  alternatives?: ProjectRoadmap[];
}
```

**Implementation Notes:**
- Use Claude Sonnet 4 for structured generation
- Validate phase dependencies
- Generate 2-3 alternatives for user choice
- Cache for brief hash

#### 3. Project Creation Endpoint
```typescript
POST /api/projects/create-hybrid
Request: {
  brief: BriefState;
  conversation: ConversationMessage[];
  roadmap?: ProjectRoadmap;
  uploaded_files?: string[]; // S3 keys
}
Response: {
  project: Project;
  conversation_id: string;
}
```

**Implementation Notes:**
- Transactional creation
- Store conversation for history
- Link uploaded files to project
- Send confirmation email

#### 4. Conversation History Endpoint
```typescript
GET /api/projects/{projectId}/conversation
Response: {
  conversation: ConversationMessage[];
  brief_snapshots: BriefSnapshot[];
  created_at: string;
}
```

### Service Layer Updates

#### 1. HybridProjectParser Service
```typescript
// Current (Mock)
class HybridProjectParser {
  async analyzeConversation(...) {
    // Mock implementation
    return mockAnalysis;
  }
}

// Target Implementation
class HybridProjectParser {
  constructor(
    private apiClient: APIClient,
    private cache: CacheService
  ) {}

  async analyzeConversation(...) {
    const cacheKey = this.getCacheKey(message, context);
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const response = await this.apiClient.post(
      '/api/projects/analyze-conversation',
      { message, conversation_history, uploaded_files }
    );

    await this.cache.set(cacheKey, response.analysis, 300); // 5 min
    return response.analysis;
  }
}
```

#### 2. Error Handling Pattern
```typescript
class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean,
    public userMessage?: string
  ) {
    super(message);
  }
}

// In service methods
async analyzeConversation(...) {
  try {
    const response = await this.apiClient.post(...);
    return response.analysis;
  } catch (error) {
    if (error.status === 429) {
      throw new ServiceError(
        'Rate limit exceeded',
        'RATE_LIMIT',
        true,
        'Too many requests. Please wait a moment.'
      );
    }
    // ... other error cases
  }
}
```

## Implementation Phases

### Phase 1: API Foundation (Week 1)

#### Day 1-2: Backend Setup
1. **Create API endpoints with mock responses**
   ```python
   # FastAPI example
   @router.post("/api/projects/analyze-conversation")
   async def analyze_conversation(
       request: ConversationAnalysisRequest,
       current_user: User = Depends(get_current_user)
   ):
       # Mock implementation first
       return {
           "analysis": {
               "project_name": f"Project from {request.message[:20]}",
               "confidence": 0.8,
               # ... other fields
           }
       }
   ```

2. **Set up request/response validation**
   - Pydantic models matching TypeScript interfaces
   - Request validation middleware
   - Response serialization

3. **Add authentication middleware**
   - JWT validation
   - User context injection
   - Permission checks

#### Day 3-4: Service Integration
1. **Update frontend services to use real APIs**
   ```typescript
   // Before
   async analyzeConversation(...) {
     await simulateDelay(800);
     return mockAnalysis;
   }

   // After
   async analyzeConversation(...) {
     const response = await fetch('/api/projects/analyze-conversation', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${await getAuthToken()}`
       },
       body: JSON.stringify({...})
     });
     
     if (!response.ok) {
       throw await this.handleAPIError(response);
     }
     
     return response.json();
   }
   ```

2. **Add retry logic**
   ```typescript
   async function withRetry<T>(
     fn: () => Promise<T>,
     options: RetryOptions = {}
   ): Promise<T> {
     const { maxAttempts = 3, delay = 1000, backoff = 2 } = options;
     
     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
       try {
         return await fn();
       } catch (error) {
         if (!isRetryable(error) || attempt === maxAttempts) {
           throw error;
         }
         await sleep(delay * Math.pow(backoff, attempt - 1));
       }
     }
   }
   ```

#### Day 5: Error Handling
1. **Add error boundaries**
   ```tsx
   export class WizardErrorBoundary extends React.Component<Props, State> {
     static getDerivedStateFromError(error: Error) {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: ErrorInfo) {
       console.error('Wizard error:', error, errorInfo);
       // Send to error tracking service
     }

     render() {
       if (this.state.hasError) {
         return <WizardErrorFallback error={this.state.error} />;
       }
       return this.props.children;
     }
   }
   ```

2. **Implement graceful degradation**
   - Offline mode with localStorage
   - Partial functionality when services down
   - Clear user communication

### Phase 2: State Persistence (Week 2)

#### Day 1-2: Draft Saving
1. **Implement auto-save functionality**
   ```typescript
   const useAutoSave = (
     data: any,
     saveFunction: (data: any) => Promise<void>,
     delay: number = 2000
   ) => {
     const [saving, setSaving] = useState(false);
     const [lastSaved, setLastSaved] = useState<Date | null>(null);

     useEffect(() => {
       const timer = setTimeout(async () => {
         if (JSON.stringify(data) !== JSON.stringify(lastSavedData)) {
           setSaving(true);
           try {
             await saveFunction(data);
             setLastSaved(new Date());
           } catch (error) {
             console.error('Auto-save failed:', error);
           } finally {
             setSaving(false);
           }
         }
       }, delay);

       return () => clearTimeout(timer);
     }, [data, delay]);

     return { saving, lastSaved };
   };
   ```

2. **Add draft storage**
   ```typescript
   class DraftStorage {
     private readonly STORAGE_KEY = 'hybrid-wizard-draft';

     save(state: HybridWizardState): void {
       try {
         const draft = {
           state,
           timestamp: new Date().toISOString(),
           version: 1
         };
         localStorage.setItem(this.STORAGE_KEY, JSON.stringify(draft));
       } catch (error) {
         console.warn('Failed to save draft:', error);
       }
     }

     load(): HybridWizardState | null {
       try {
         const stored = localStorage.getItem(this.STORAGE_KEY);
         if (!stored) return null;

         const draft = JSON.parse(stored);
         // Validate version compatibility
         if (draft.version !== 1) return null;
         
         return draft.state;
       } catch {
         return null;
       }
     }

     clear(): void {
       localStorage.removeItem(this.STORAGE_KEY);
     }
   }
   ```

#### Day 3-4: Recovery Mechanisms
1. **Session recovery after disconnect**
   ```typescript
   const useSessionRecovery = () => {
     const [isRecovering, setIsRecovering] = useState(false);

     useEffect(() => {
       const handleOnline = async () => {
         setIsRecovering(true);
         try {
           // Sync any pending changes
           await syncPendingChanges();
           // Refresh auth token
           await refreshAuthToken();
         } finally {
           setIsRecovering(false);
         }
       };

       window.addEventListener('online', handleOnline);
       return () => window.removeEventListener('online', handleOnline);
     }, []);

     return { isRecovering };
   };
   ```

2. **Implement optimistic updates**
   - Update UI immediately
   - Queue API calls
   - Rollback on failure

#### Day 5: Progress Tracking
1. **Add completion percentage**
   ```typescript
   function calculateCompleteness(brief: BriefState): number {
     const fields = ['name', 'type', 'description', 'objective'];
     const weights = { name: 0.2, type: 0.1, description: 0.3, objective: 0.3 };
     
     let score = 0;
     for (const field of fields) {
       if (brief[field].value) {
         score += weights[field] * brief[field].confidence;
       }
     }
     
     // Deliverables contribute 10%
     if (brief.key_deliverables.value?.length > 0) {
       score += 0.1;
     }
     
     return Math.round(score * 100);
   }
   ```

### Phase 3: Real-time Features (Week 3)

#### Day 1-2: Streaming Responses
1. **Implement SSE for AI responses**
   ```typescript
   class StreamingService {
     async streamAnalysis(
       message: string,
       onChunk: (chunk: AnalysisChunk) => void
     ): Promise<ConversationAnalysis> {
       const response = await fetch('/api/projects/analyze-conversation/stream', {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json',
           'Accept': 'text/event-stream'
         },
         body: JSON.stringify({ message })
       });

       const reader = response.body!.getReader();
       const decoder = new TextDecoder();
       let analysis = {};

       while (true) {
         const { done, value } = await reader.read();
         if (done) break;

         const chunk = decoder.decode(value);
         const parsed = JSON.parse(chunk);
         analysis = { ...analysis, ...parsed };
         onChunk(parsed);
       }

       return analysis as ConversationAnalysis;
     }
   }
   ```

2. **Add typing indicators**
   ```tsx
   const TypingIndicator: React.FC<{ phase: string }> = ({ phase }) => {
     return (
       <div className="flex items-center gap-2 text-sm text-muted-foreground">
         <div className="flex gap-1">
           {[0, 150, 300].map((delay) => (
             <div
               key={delay}
               className="w-1 h-1 bg-accent rounded-full animate-bounce"
               style={{ animationDelay: `${delay}ms` }}
             />
           ))}
         </div>
         <span>AI is {phase}...</span>
       </div>
     );
   };
   ```

#### Day 3-4: Performance Optimization
1. **Implement request debouncing**
   ```typescript
   const useDebouncedAnalysis = (
     value: string,
     delay: number = 1000
   ) => {
     const [debouncedValue, setDebouncedValue] = useState(value);
     const [isDebouncing, setIsDebouncing] = useState(false);

     useEffect(() => {
       setIsDebouncing(true);
       const timer = setTimeout(() => {
         setDebouncedValue(value);
         setIsDebouncing(false);
       }, delay);

       return () => clearTimeout(timer);
     }, [value, delay]);

     return { debouncedValue, isDebouncing };
   };
   ```

2. **Add request caching**
   ```typescript
   class RequestCache {
     private cache = new Map<string, CacheEntry>();
     private readonly maxAge = 5 * 60 * 1000; // 5 minutes

     set(key: string, data: any): void {
       this.cache.set(key, {
         data,
         timestamp: Date.now()
       });
       this.cleanup();
     }

     get(key: string): any | null {
       const entry = this.cache.get(key);
       if (!entry) return null;

       if (Date.now() - entry.timestamp > this.maxAge) {
         this.cache.delete(key);
         return null;
       }

       return entry.data;
     }

     private cleanup(): void {
       const now = Date.now();
       for (const [key, entry] of this.cache.entries()) {
         if (now - entry.timestamp > this.maxAge) {
           this.cache.delete(key);
         }
       }
     }
   }
   ```

#### Day 5: UI Polish
1. **Add smooth transitions**
   ```css
   /* Brief field updates */
   .field-update-enter {
     opacity: 0;
     transform: translateY(-4px);
   }

   .field-update-enter-active {
     opacity: 1;
     transform: translateY(0);
     transition: all 300ms ease-out;
   }

   /* AI confidence indicators */
   .confidence-bar {
     background: linear-gradient(
       to right,
       theme('colors.accent') 0%,
       theme('colors.accent') var(--confidence),
       theme('colors.muted.foreground') var(--confidence)
     );
     transition: background 600ms ease-out;
   }
   ```

### Phase 4: Testing & Security (Week 4)

#### Day 1-2: Integration Tests
1. **Test complete wizard flow**
   ```typescript
   describe('HybridProjectWizard Integration', () => {
     it('should create project from conversation', async () => {
       const { user } = renderWithProviders(<HybridProjectCreator />);

       // Start conversation
       const input = screen.getByPlaceholderText(/describe your project/i);
       await user.type(input, 'I want to build a task management app');
       await user.keyboard('{Enter}');

       // Wait for AI response
       await waitFor(() => {
         expect(screen.getByText(/task management app/i)).toBeInTheDocument();
       });

       // Verify brief updates
       expect(screen.getByText('Task Management App')).toBeInTheDocument();

       // Edit a field directly
       const nameField = screen.getByText('Task Management App');
       await user.click(nameField);
       const nameInput = screen.getByDisplayValue('Task Management App');
       await user.clear(nameInput);
       await user.type(nameInput, 'TaskMaster Pro');

       // Create project
       const createButton = screen.getByText(/create project/i);
       await user.click(createButton);

       // Verify creation
       await waitFor(() => {
         expect(mockCreateProject).toHaveBeenCalledWith(
           expect.objectContaining({
             name: 'TaskMaster Pro'
           })
         );
       });
     });
   });
   ```

#### Day 3: Security Audit
1. **Input validation**
   ```typescript
   const validateProjectName = (name: string): ValidationResult => {
     const errors: string[] = [];

     if (!name.trim()) {
       errors.push('Project name is required');
     }

     if (name.length > 100) {
       errors.push('Project name must be less than 100 characters');
     }

     if (!/^[\w\s\-\.]+$/.test(name)) {
       errors.push('Project name contains invalid characters');
     }

     return {
       isValid: errors.length === 0,
       errors
     };
   };
   ```

2. **XSS prevention**
   ```typescript
   import DOMPurify from 'isomorphic-dompurify';

   const sanitizeUserInput = (input: string): string => {
     return DOMPurify.sanitize(input, {
       ALLOWED_TAGS: [],
       ALLOWED_ATTR: []
     });
   };
   ```

#### Day 4: Performance Testing
1. **Load testing the wizard**
   ```typescript
   describe('Performance', () => {
     it('should handle rapid message submission', async () => {
       const messages = Array.from({ length: 50 }, (_, i) => 
         `Test message ${i}`
       );

       const startTime = performance.now();

       for (const message of messages) {
         await submitMessage(message);
       }

       const endTime = performance.now();
       const totalTime = endTime - startTime;

       expect(totalTime).toBeLessThan(10000); // 10 seconds for 50 messages
       expect(getMemoryUsage()).toBeLessThan(50 * 1024 * 1024); // 50MB
     });
   });
   ```

#### Day 5: Documentation
1. **API documentation**
   ```yaml
   openapi: 3.0.0
   info:
     title: Hybrid Project Wizard API
     version: 1.0.0
   paths:
     /api/projects/analyze-conversation:
       post:
         summary: Analyze conversation for project details
         requestBody:
           required: true
           content:
             application/json:
               schema:
                 $ref: '#/components/schemas/ConversationAnalysisRequest'
         responses:
           200:
             description: Analysis complete
             content:
               application/json:
                 schema:
                   $ref: '#/components/schemas/ConversationAnalysisResponse'
   ```

## Testing Strategy

### Unit Tests
```typescript
// For each hook
describe('useConversation', () => {
  it('should add messages to conversation', () => {
    const { result } = renderHook(() => useConversation(defaultConfig));
    
    act(() => {
      result.current.submitMessage('Test message');
    });

    expect(result.current.conversation.messages).toHaveLength(2); // Initial + new
    expect(result.current.conversation.messages[1].content).toBe('Test message');
  });
});
```

### Integration Tests
```typescript
describe('Wizard Integration', () => {
  it('should sync conversation and brief state', async () => {
    const { result } = renderHook(() => useHybridProjectState());
    
    // Submit message
    await act(async () => {
      await result.current.submitMessage('Building a React app');
    });

    // Verify both states updated
    expect(result.current.state.conversation.messages).toHaveLength(2);
    expect(result.current.state.brief.description.value).toContain('React');
  });
});
```

### E2E Tests with Playwright
```typescript
test('complete wizard flow', async ({ page }) => {
  // Navigate to projects page
  await page.goto('/projects');
  
  // Open hybrid wizard
  await page.click('text=Create with AI');
  
  // Start conversation
  await page.fill('[placeholder*="Describe your project"]', 'E-commerce platform');
  await page.press('[placeholder*="Describe your project"]', 'Enter');
  
  // Wait for AI response
  await page.waitForSelector('text=E-commerce platform');
  
  // Edit project name
  await page.click('h1:has-text("Untitled Project")');
  await page.fill('input[value="Untitled Project"]', 'ShopEasy');
  
  // Create project
  await page.click('text=Create Project');
  
  // Verify redirect
  await expect(page).toHaveURL(/\/projects\/[a-z0-9-]+/);
});
```

## Security Considerations

### Input Validation
1. **File Upload Security**
   ```typescript
   const validateFile = (file: File): ValidationResult => {
     const maxSize = 10 * 1024 * 1024; // 10MB
     const allowedTypes = [
       'application/pdf',
       'text/plain',
       'image/png',
       'image/jpeg'
     ];

     if (file.size > maxSize) {
       return { isValid: false, error: 'File too large' };
     }

     if (!allowedTypes.includes(file.type)) {
       return { isValid: false, error: 'File type not allowed' };
     }

     // Additional magic number validation
     return validateMagicNumbers(file);
   };
   ```

2. **Rate Limiting**
   ```typescript
   class RateLimiter {
     private attempts = new Map<string, number[]>();

     isAllowed(userId: string, limit: number, window: number): boolean {
       const now = Date.now();
       const userAttempts = this.attempts.get(userId) || [];
       
       // Remove old attempts
       const validAttempts = userAttempts.filter(
         time => now - time < window
       );

       if (validAttempts.length >= limit) {
         return false;
       }

       validAttempts.push(now);
       this.attempts.set(userId, validAttempts);
       return true;
     }
   }
   ```

### Authentication & Authorization
```typescript
// Middleware for API routes
export async function requireAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  next: () => void
) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = await verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

## Performance Optimization

### Frontend Optimizations
1. **Code Splitting**
   ```typescript
   // Lazy load the wizard
   const HybridProjectCreator = lazy(() => 
     import('@/components/projects/HybridProjectCreator')
   );

   // Use with Suspense
   <Suspense fallback={<WizardSkeleton />}>
     <HybridProjectCreator {...props} />
   </Suspense>
   ```

2. **Virtual Scrolling for Messages**
   ```typescript
   import { VariableSizeList } from 'react-window';

   const MessageList = ({ messages }) => (
     <VariableSizeList
       height={600}
       itemCount={messages.length}
       itemSize={(index) => getMessageHeight(messages[index])}
       width="100%"
     >
       {({ index, style }) => (
         <div style={style}>
           <Message message={messages[index]} />
         </div>
       )}
     </VariableSizeList>
   );
   ```

### Backend Optimizations
1. **Database Queries**
   ```sql
   -- Index for conversation retrieval
   CREATE INDEX idx_conversations_project_user 
   ON conversations(project_id, user_id);

   -- Composite index for message ordering
   CREATE INDEX idx_messages_conversation_timestamp 
   ON messages(conversation_id, created_at DESC);
   ```

2. **Caching Strategy**
   ```python
   from functools import lru_cache
   from redis import Redis

   redis_client = Redis()

   @lru_cache(maxsize=1000)
   def get_cached_analysis(message_hash: str) -> Optional[dict]:
       cached = redis_client.get(f"analysis:{message_hash}")
       if cached:
           return json.loads(cached)
       return None

   def cache_analysis(message_hash: str, analysis: dict):
       redis_client.setex(
           f"analysis:{message_hash}",
           300,  # 5 minutes
           json.dumps(analysis)
       )
   ```

## Deployment Strategy

### Environment Configuration
```bash
# .env.production
NEXT_PUBLIC_API_URL=https://api.echo-app.com
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
SENTRY_DSN=https://...
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Hybrid Wizard

on:
  push:
    branches: [main]
    paths:
      - 'echo-application/**'
      - 'api/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:e2e

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

### Monitoring & Observability
```typescript
// Sentry integration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Filter out sensitive data
    if (event.request?.data) {
      delete event.request.data.conversation_history;
    }
    return event;
  }
});

// Custom instrumentation
export function trackWizardMetrics(action: string, metadata: any) {
  Sentry.addBreadcrumb({
    category: 'wizard',
    message: action,
    data: metadata,
    level: 'info'
  });

  // Also send to analytics
  if (window.analytics) {
    window.analytics.track('Wizard Action', {
      action,
      ...metadata
    });
  }
}
```

## Conclusion

This implementation strategy provides a comprehensive roadmap for completing the Echo Hybrid Project Creation Wizard. The refactored architecture provides a solid foundation for the remaining work, with clear separation of concerns and testable components.

Key success factors:
1. Maintain the architectural principles established during refactoring
2. Implement features incrementally with thorough testing
3. Prioritize user experience with proper error handling and feedback
4. Ensure security at every layer
5. Monitor performance and iterate based on metrics

The estimated timeline of 4 weeks allows for thorough implementation and testing, with buffer time for addressing unexpected challenges. Each phase builds upon the previous, ensuring a stable and maintainable system.