# Code Deduplication Opportunities in Editor Package

This document outlines opportunities to remove repeated code patterns in the `packages/editor` package, organized by category and priority.

## 🔧 High Priority - Event Listener Management Patterns

### Pattern: useEffect + addEventListener + removeEventListener
**Found in**: Multiple hooks (`useDocumentEvents`, `usePassThroughWheelEvents`, `usePassThroughMouseOverEvents`, `useScreenBounds`, `useViewportHeight`, `useCoarsePointer`, etc.)

**Current Duplication**:
```typescript
useEffect(() => {
    const handleEvent = (e: Event) => { /* logic */ }
    element.addEventListener('eventType', handleEvent, options)
    return () => {
        element.removeEventListener('eventType', handleEvent)
    }
}, deps)
```

**Refactoring Opportunity**:
Create a custom hook `useEventListener(element, eventType, handler, options, deps)` to consolidate this pattern.

**Lines Saved**: **~85-95 lines**
- `useDocumentEvents.ts`: ~35 lines (5 event listeners × 7 lines each)
- `usePassThroughWheelEvents.ts`: ~8 lines  
- `usePassThroughMouseOverEvents.ts`: ~8 lines
- `useScreenBounds.ts`: ~6 lines
- `useViewportHeight.ts`: ~8 lines
- `useCoarsePointer.ts`: ~12 lines
- `useFixSafariDoubleTapZoomPencilEvents.ts`: ~8 lines

**Files Affected**: 
- `useDocumentEvents.ts` (multiple event listeners)
- `usePassThroughWheelEvents.ts`
- `usePassThroughMouseOverEvents.ts` 
- `useScreenBounds.ts`
- `useViewportHeight.ts`
- `useCoarsePointer.ts`
- `useFixSafariDoubleTapZoomPencilEvents.ts`

## 🎯 Medium Priority - Pass-Through Event Patterns

### Pattern: Event Redispatching to Canvas
**Found in**: `usePassThroughWheelEvents`, `usePassThroughMouseOverEvents`, and `useDocumentEvents`

**Current Duplication**:
```typescript
function handleEvent(e: Event) {
    if ((e as any).isSpecialRedispatchedEvent) return
    preventDefault(e)
    const cvs = container.querySelector('.tl-canvas')
    if (!cvs) return
    const newEvent = new EventType(e.type, e as any)
    ;(newEvent as any).isSpecialRedispatchedEvent = true
    cvs.dispatchEvent(newEvent)
}
```

**Refactoring Opportunity**:
Create a utility function `redispatchEventToCanvas(container, originalEvent, EventConstructor)` to consolidate this logic.

**Lines Saved**: **~18-22 lines**
- `usePassThroughWheelEvents.ts`: ~8 lines
- `usePassThroughMouseOverEvents.ts`: ~6 lines  
- `useDocumentEvents.ts` (drag events): ~8 lines

**Files Affected**:
- `usePassThroughWheelEvents.ts` 
- `usePassThroughMouseOverEvents.ts`
- `useDocumentEvents.ts` (drag events)

## 🏗️ Medium Priority - Shape Bounds Calculation Patterns

### Pattern: getShapePageBounds Usage
**Found in**: Multiple files with similar bounds checking patterns

**Current Duplication**:
```typescript
const bounds = editor.getShapePageBounds(shape)
if (!bounds) return // or similar null checks
// Use bounds for calculations
```

**Refactoring Opportunity**:
Create utility functions for common bounds operations:
- `getRequiredShapePageBounds(editor, shape)` - throws if bounds null
- `getShapePageBoundsOrDefault(editor, shape, defaultBounds)`
- `ensureShapePageBounds(editor, shapes)` - filters out shapes without bounds

**Lines Saved**: **~40-50 lines**
- `Editor.ts`: ~25 lines (25+ occurrences × 1-2 lines each)
- `SnapManager.ts` and related: ~10 lines
- `DefaultCanvas.tsx`: ~3 lines
- `reorderShapes.ts`: ~4 lines
- Other files: ~8 lines

**Files Affected**:
- `Editor.ts` (25+ occurrences)
- `SnapManager.ts` and related snap files
- `DefaultCanvas.tsx`
- `reorderShapes.ts`

## 🔄 Low Priority - Editor State Access Patterns

### Pattern: this.editor Access in Managers
**Found in**: Multiple manager classes

**Current Duplication**:
```typescript
this.editor.getContainer()
this.editor.getInstanceState()
this.editor.getSelectedShapes()
// etc.
```

**Refactoring Opportunity**:
Create base manager class with common editor access methods or use dependency injection for commonly accessed editor methods.

**Lines Saved**: **~15-25 lines**
- `FocusManager.ts`: ~8 lines
- `SnapManager.ts`: ~4 lines  
- `FontManager.ts`: ~3 lines
- `TextManager.ts`: ~2 lines
- `ScribbleManager.ts`: ~3 lines
- Other managers: ~5 lines

**Files Affected**:
- `FocusManager.ts`
- `SnapManager.ts`
- `FontManager.ts`
- `TextManager.ts`
- `ScribbleManager.ts`

## 🎪 Low Priority - Hook Parameter Validation

### Pattern: Ref Validation in Hooks
**Found in**: Multiple custom hooks

**Current Duplication**:
```typescript
if (!ref) throw Error('useHookName must be passed a ref')
```

**Refactoring Opportunity**:
Create a utility function `validateHookRef(ref, hookName)` or use a custom hook wrapper.

**Lines Saved**: **~4-6 lines**
- `usePassThroughWheelEvents.ts`: ~2 lines
- `usePassThroughMouseOverEvents.ts`: ~2 lines
- Potential future hooks: ~2 lines

**Files Affected**:
- `usePassThroughWheelEvents.ts`
- `usePassThroughMouseOverEvents.ts`

## 📝 Utility Function Opportunities

### Pattern: Event Prevention
**Found in**: `dom.ts` exports `preventDefault` and `stopEventPropagation` but could be enhanced

**Refactoring Opportunity**:
Create combined utility functions:
- `preventAndStopEvent(e)` - combines preventDefault + stopPropagation
- `conditionalPreventDefault(e, condition)` - prevents based on condition

**Lines Saved**: **~8-12 lines**
- Various event handlers: ~10 lines where both are called together

### Pattern: MediaQuery Management
**Found in**: `useDocumentEvents.ts` has complex MediaQuery handling that could be extracted

**Refactoring Opportunity**:
Create `useMediaQuery(query, callback)` hook to handle addEventListener/removeEventListener for media queries.

**Lines Saved**: **~15-20 lines**
- `useDocumentEvents.ts`: ~18 lines (complex media query setup)

## 🚀 Implementation Strategy

### Phase 1: High-Impact, Low-Risk
1. Create `useEventListener` hook (**~85-95 lines saved**)
2. Create event redispatch utilities (**~18-22 lines saved**)
3. Replace 3-5 most obvious duplicated patterns

### Phase 2: Medium-Impact Refactoring  
1. Create shape bounds utility functions (**~40-50 lines saved**)
2. Implement base manager class patterns (**~15-25 lines saved**)
3. Create media query management hook (**~15-20 lines saved**)

### Phase 3: Polish and Optimization
1. Add parameter validation utilities (**~4-6 lines saved**)
2. Create combined event utilities (**~8-12 lines saved**)
3. Review and consolidate any remaining patterns

## 📊 Updated Impact Assessment

**Total Lines of Code Reduction**: **190-240 lines**
- **High Priority**: 103-117 lines (54% of total savings)
- **Medium Priority**: 70-95 lines (37% of total savings)
- **Low Priority**: 17-28 lines (9% of total savings)

**Breakdown by Category**:
- Event Management: ~103-117 lines (largest impact)
- Shape Bounds: ~40-50 lines  
- Manager Patterns: ~15-25 lines
- Media Query: ~15-20 lines
- Event Prevention: ~8-12 lines
- Hook Validation: ~4-6 lines

**Maintenance Improvement**: Significant - centralized event handling patterns
**Testing Benefits**: Easier to test common patterns in isolation
**Performance Impact**: Minimal to none, possibly slight improvement from shared functions

## 🛠️ Recommended Next Steps

1. **Start with `useEventListener` hook** - highest impact (85-95 lines), safest change
2. **Create event redispatch utilities** - clear pattern (18-22 lines), easy to test
3. **Gradually migrate existing hooks** - one at a time to minimize risk
4. **Add comprehensive tests** for new utility functions
5. **Update documentation** to encourage use of new patterns

This analysis identified the most significant opportunities for code deduplication while maintaining the current functionality and improving maintainability.