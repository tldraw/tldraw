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

### Pattern: MediaQuery Management
**Found in**: `useDocumentEvents.ts` has complex MediaQuery handling that could be extracted

**Refactoring Opportunity**:
Create `useMediaQuery(query, callback)` hook to handle addEventListener/removeEventListener for media queries.

## 🚀 Implementation Strategy

### Phase 1: High-Impact, Low-Risk
1. Create `useEventListener` hook
2. Create event redispatch utilities
3. Replace 3-5 most obvious duplicated patterns

### Phase 2: Medium-Impact Refactoring  
1. Create shape bounds utility functions
2. Implement base manager class patterns
3. Create media query management hook

### Phase 3: Polish and Optimization
1. Add parameter validation utilities
2. Create combined event utilities
3. Review and consolidate any remaining patterns

## 📊 Impact Assessment

**Lines of Code Reduction**: Estimated 200-300 lines
**Maintenance Improvement**: Significant - centralized event handling patterns
**Testing Benefits**: Easier to test common patterns in isolation
**Performance Impact**: Minimal to none, possibly slight improvement from shared functions

## 🛠️ Recommended Next Steps

1. **Start with `useEventListener` hook** - highest impact, safest change
2. **Create event redispatch utilities** - clear pattern, easy to test
3. **Gradually migrate existing hooks** - one at a time to minimize risk
4. **Add comprehensive tests** for new utility functions
5. **Update documentation** to encourage use of new patterns

This analysis identified the most significant opportunities for code deduplication while maintaining the current functionality and improving maintainability.