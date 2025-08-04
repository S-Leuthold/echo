# Known Issues

## Calendar Visual Collision Bug

**Issue**: Consecutive blocks in the weekly calendar (like 16:15-16:30 "Commute to Gym" followed by 16:30-17:45 "Strength Training") still visually overlap despite positioning calculations.

**Status**: Open
**Priority**: Low (Visual only, doesn't affect functionality)

**Details**: 
- Blocks are positioned correctly in terms of time alignment
- Visual collision persists even after:
  - Removing side margins (`left-1 right-1` → `left-0 right-0`)
  - Eliminating hover scaling
  - Adding consistent padding
  - Adding small gap between block heights (`heightRem - 0.125`)

**Next Steps**: Requires deeper investigation into CSS positioning and potential z-index conflicts.