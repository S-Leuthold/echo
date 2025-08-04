# Technical Debt Tracker

> Last Updated: 2025-08-04  
> Status: 🔴 High Priority Items Need Attention

## Overview

This document tracks technical debt items in the Echo project. Items are prioritized by impact and effort, with clear remediation paths.

## Priority Levels
- 🔴 **CRITICAL**: Security, data loss, or major functionality issues
- 🟠 **HIGH**: Performance, UX, or maintainability issues
- 🟡 **MEDIUM**: Code quality, minor bugs, or enhancement opportunities
- 🟢 **LOW**: Nice-to-have improvements or optimizations

---

## 🔴 CRITICAL Issues

### 1. Hardcoded Configuration Values
**Impact**: Security risk, deployment blocker  
**Effort**: Medium (2-3 days)  
**Location**: Throughout frontend and backend  

**Details:**
- 50+ instances of hardcoded `localhost` URLs
- API endpoints directly embedded in code
- Hardcoded ports (3000, 8000) in multiple files
- Test files containing hardcoded credentials

**Files Affected:**
- `frontend/src/services/*.ts` - All service files
- `frontend/src/hooks/*.ts` - API hooks
- `tests/test_*.py` - Test files
- `echo/api/routers/*.py` - Some router files

**Remediation Plan:**
1. Create centralized configuration service
2. Use environment variables for all URLs
3. Implement config validation on startup
4. Update all hardcoded references

**Tracking:**
- [ ] Create `frontend/src/config/api.ts`
- [ ] Create `.env.local` template
- [ ] Update all service files
- [ ] Update all test files
- [ ] Add configuration documentation

### 2. Missing Error Boundaries
**Impact**: Application crashes, poor UX  
**Effort**: Medium (2 days)  
**Location**: React components  

**Details:**
- Most components lack error boundaries
- No fallback UI for component failures
- Errors can crash entire page

**Files Affected:**
- `frontend/src/app/projects/page.tsx`
- `frontend/src/app/analytics/page.tsx`
- `frontend/src/components/projects/*`

**Remediation Plan:**
1. Create reusable ErrorBoundary component
2. Wrap all major page components
3. Implement fallback UI designs
4. Add error logging service

### 3. API Key Management
**Impact**: Security vulnerability  
**Effort**: Low (1 day)  
**Location**: Backend configuration  

**Details:**
- API keys referenced in multiple locations
- No centralized secret management
- Keys visible in error messages (dev mode)

**Remediation Plan:**
1. Centralize all API keys in environment variables
2. Create secret validation on startup
3. Sanitize error messages in production
4. Document key rotation process

---

## 🟠 HIGH Priority Issues

### 4. TODO/FIXME Items in Production Code
**Impact**: Incomplete functionality, potential bugs  
**Effort**: High (1 week)  
**Location**: Throughout codebase  

**Current TODOs (15+ items in api_server.py):**
```python
# TODO: Implement email context integration
# TODO: Add session insights from database
# TODO: Include config reminders
# FIXME: Temporary mock data for demo
# TODO: Add proper error handling here
```

**Remediation Plan:**
1. Audit all TODO/FIXME comments
2. Convert to GitHub issues
3. Implement missing features
4. Remove completed TODOs

### 5. Console.log Statements in Production
**Impact**: Performance, security (data leakage)  
**Effort**: Low (4 hours)  
**Location**: Frontend code  

**Files with console.log:**
- `frontend/src/services/sessionApiService.ts` - 5 instances
- `frontend/src/components/projects/*.tsx` - 8 instances
- `frontend/src/hooks/*.ts` - 3 instances

**Remediation Plan:**
1. Create logging service with levels
2. Replace console.log with logger
3. Configure production log suppression
4. Add ESLint rule to prevent console.log

### 6. Missing Input Validation
**Impact**: Security, data integrity  
**Effort**: Medium (3 days)  
**Location**: API endpoints  

**Vulnerable Endpoints:**
- POST `/projects` - No name length validation
- POST `/conversations/*/message` - No content sanitization
- POST `/config/save` - Missing schema validation

**Remediation Plan:**
1. Add Pydantic validators for all inputs
2. Implement request size limits
3. Add SQL injection prevention
4. Create validation middleware

---

## 🟡 MEDIUM Priority Issues

### 7. Code Duplication
**Impact**: Maintainability, bug propagation  
**Effort**: Medium (3 days)  
**Location**: Frontend services and components  

**Duplicated Patterns:**
```typescript
// Same error handling pattern in 10+ files
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error();
  return response.json();
} catch (error) {
  console.error(error);
  return null;
}
```

**Remediation Plan:**
1. Extract common API client
2. Create shared error handler
3. Consolidate mock data
4. Use composition for repeated UI patterns

### 8. Large Component Files
**Impact**: Maintainability, performance  
**Effort**: High (1 week)  
**Location**: Frontend components  

**Oversized Files:**
- `frontend/src/app/projects/page.tsx` - 1200+ lines
- `frontend/src/components/projects/HybridProjectCreator.tsx` - 800+ lines
- `api_server.py` - 1500+ lines

**Remediation Plan:**
1. Split into smaller, focused components
2. Extract business logic to hooks
3. Move utilities to separate files
4. Create component composition patterns

### 9. Inconsistent Timeout Configurations
**Impact**: Performance, reliability  
**Effort**: Low (1 day)  
**Location**: API calls  

**Current Timeouts:**
- Email API: 30 seconds
- Planning API: 60 seconds
- Conversation API: 120 seconds
- No timeout: Several endpoints

**Remediation Plan:**
1. Define timeout strategy document
2. Standardize timeout values
3. Implement timeout configuration
4. Add retry logic where appropriate

### 10. Test Coverage Gaps
**Impact**: Reliability, regression risk  
**Effort**: High (2 weeks)  
**Location**: Throughout  

**Coverage Gaps:**
- Frontend: ~30% coverage
- Backend: ~60% coverage
- No E2E tests
- Missing error scenario tests

**Remediation Plan:**
1. Set coverage targets (80% minimum)
2. Add unit tests for critical paths
3. Implement E2E test suite
4. Add visual regression tests

---

## 🟢 LOW Priority Issues

### 11. Icon Resolution Performance
**Impact**: Minor performance impact  
**Effort**: Low (4 hours)  
**Location**: `frontend/src/lib/icon-resolution.ts`  

**Remediation:**
- Add memoization
- Implement icon cache
- Lazy load icon components

### 12. Mock Data Management
**Impact**: Development efficiency  
**Effort**: Low (1 day)  
**Location**: Multiple test files  

**Remediation:**
- Centralize mock data
- Create mock data generators
- Use fixtures consistently

### 13. Missing TypeScript Strict Mode
**Impact**: Type safety  
**Effort**: High (1 week)  
**Location**: Frontend  

**Remediation:**
- Enable strict mode gradually
- Fix type errors incrementally
- Add strict checks to CI

---

## Debt Metrics

### Current Status
- **Critical Issues**: 3
- **High Priority**: 3  
- **Medium Priority**: 4
- **Low Priority**: 3
- **Total Items**: 13

### Estimated Effort
- **Total Days**: ~35 developer days
- **Critical Path**: 5-6 days (blocking issues)
- **Quick Wins**: 3-4 days (console.log, timeouts, etc.)

### Risk Assessment
- **Security Risk**: HIGH (API keys, validation)
- **Stability Risk**: MEDIUM (error handling)
- **Performance Risk**: LOW (minor optimizations needed)
- **Maintainability Risk**: MEDIUM (code duplication, large files)

---

## Remediation Schedule

### Sprint 1 (Week 1) - Critical Security
- [ ] Centralize configuration (2 days)
- [ ] Fix API key management (1 day)
- [ ] Add input validation (2 days)

### Sprint 2 (Week 2) - Stability
- [ ] Add error boundaries (2 days)
- [ ] Remove console.log statements (0.5 days)
- [ ] Standardize timeouts (1 day)
- [ ] Basic error handling improvements (1.5 days)

### Sprint 3 (Week 3) - Code Quality
- [ ] Address TODO items (5 days)

### Sprint 4 (Week 4) - Refactoring
- [ ] Extract duplicated code (3 days)
- [ ] Split large components (2 days)

### Ongoing - Testing & Documentation
- [ ] Increase test coverage (continuous)
- [ ] Update documentation (continuous)
- [ ] Performance optimizations (as needed)

---

## Success Criteria

### Phase 1 Complete When:
- ✅ No hardcoded URLs in production code
- ✅ All API keys in environment variables
- ✅ Error boundaries on all pages
- ✅ Input validation on all endpoints

### Phase 2 Complete When:
- ✅ No console.log in production
- ✅ All TODOs converted to issues
- ✅ Consistent error handling
- ✅ Standardized timeouts

### Phase 3 Complete When:
- ✅ 80% test coverage
- ✅ No files over 500 lines
- ✅ No duplicated code blocks
- ✅ TypeScript strict mode enabled

---

## How to Contribute

1. **Pick an item** from this list
2. **Create a branch** named `fix/ISSUE-NAME`
3. **Update this document** when starting work (mark as 🚧 In Progress)
4. **Submit PR** with reference to this document
5. **Update status** when complete (mark as ✅ Done)

---

## Recently Completed

*None yet - this is a new tracking document*

---

## Notes

- This document should be updated weekly
- Items may be re-prioritized based on user feedback
- New debt items should be added as discovered
- Consider debt remediation in sprint planning