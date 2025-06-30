# Checkbox Geo Shape Hit Testing Fix

## Problem
The checkmark on geo shapes with `geo: 'check-box'` was not selectable when the shape was filled and positioned in front of another filled shape. This was because the internal geometry (checkmark lines) was being included in hit testing even though it couldn't be clicked on.

## Root Cause
In the `Editor.ts` file, the hit testing logic for group geometries (like geo shapes) was only filtering out labels but not internal geometries. The checkmark lines in a check-box geo shape are marked as `isInternal: true` and `isFilled: false`, but they were still being considered during hit testing calculations.

## Solution
Modified the hit testing logic in `/workspace/packages/editor/src/lib/editor/Editor.ts` (lines 5242-5243) to skip internal geometries that are not filled:

```typescript
// Skip internal geometries (like checkmarks) unless they're filled
if (childGeometry.isInternal && !childGeometry.isFilled) continue
```

This ensures that:
1. Filled checkbox shapes are properly selectable by clicking on the filled area
2. Unfilled checkbox shapes are selectable by clicking on the border/outline
3. Internal geometries like checkmarks don't interfere with hit testing when they're not filled

## Files Modified
- `/workspace/packages/editor/src/lib/editor/Editor.ts` - Added logic to skip unfilled internal geometries during hit testing
- `/workspace/packages/tldraw/src/test/getShapeAtPoint.test.ts` - Added tests to verify the fix works correctly

## Tests Added
Added comprehensive tests for checkbox geo shapes to ensure:
1. Filled checkbox shapes are selectable when in front of other filled shapes
2. Unfilled checkbox shapes behave correctly (border selectable, center passes through to background)
3. The fix doesn't break existing functionality

The fix ensures that the checkmark on geo shapes is properly selectable while maintaining the expected behavior for both filled and unfilled checkbox shapes.