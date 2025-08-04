# Echo Application - Technical Debt

This document tracks known technical debt items that should be addressed in future development cycles.

## High Priority

### Theater Mode Rendering Issues
**Date Added**: 2025-01-25  
**Component**: Theater Mode / Session State  
**Issue**: Still experiencing some rendering errors after infinite loop fixes. The core functionality works but there are remaining edge cases causing console errors.

**Context**: 
- Fixed major infinite loop issues with useEffect dependencies
- Theater mode visual hierarchy and functionality working correctly
- Remaining errors are non-blocking but should be resolved for production stability

**Impact**: Low - functionality works, but console errors affect developer experience and could indicate underlying issues

**Suggested Fix**: 
- Audit all remaining useEffect patterns for dependency issues
- Review React component lifecycle for potential state update conflicts  
- Consider refactoring theater mode state management to use reducer pattern
- Add error boundaries around theater mode components

**Related Files**:
- `/src/components/session/states/TranquilState.tsx`
- `/src/components/session/SessionStatePanel.tsx`
- `/src/app/today/page.tsx`
- `/src/components/session/EscapeTooltip.tsx`
- `/src/components/session/PanelDimmer.tsx`

---

## Medium Priority

### Calendar Tooltips Display Issues
**Date Added**: 2025-01-25  
**Component**: PlanTimeline  
**Issue**: Calendar tooltips have positioning and display issues that need refinement

**Impact**: Low - cosmetic issue affecting user experience

---

## Low Priority

### FastAPI Deprecation Warning
**Date Added**: 2025-01-25  
**Component**: Backend API Server  
**Issue**: Using deprecated `on_event` instead of lifespan event handlers

**Warning**: 
```
api_server.py:711: DeprecationWarning: on_event is deprecated, use lifespan event handlers instead.
```

**Impact**: Very Low - functionality works but should migrate to recommended patterns

**Fix**: Update to use FastAPI lifespan event handlers as per documentation

---

## Resolved

### Maximum Update Depth Exceeded Error
**Date Added**: 2025-01-25  
**Date Resolved**: 2025-01-25  
**Issue**: Infinite loops in useEffect causing React to throw maximum update depth errors
**Resolution**: Fixed dependency arrays in EscapeTooltip and PlanTimeline, added useCallback to handler functions