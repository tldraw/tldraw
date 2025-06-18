# Code Deduplication Opportunities in Editor Package

This document outlines opportunities to remove repeated code patterns in the `packages/editor` package, organized by category and priority.

## 🎯 **Editor.ts File-Specific Opportunities**

### **Pattern: Shape Array Parameter Normalization**
**Found in**: 25+ methods in `Editor.ts` that accept `shapes: TLShapeId[] | TLShape[]`

**Current Duplication**:
```typescript
const ids = typeof shapes[0] === 'string'
    ? (shapes as TLShapeId[])
    : (shapes as TLShape[]).map((s) => s.id)
```

**Refactoring Opportunity**:
Create a private utility method `private normalizeShapeIds(shapes: TLShapeId[] | TLShape[]): TLShapeId[]`

**Lines Saved**: **~75-90 lines**
- Found in: `setSelectedShapes`, `select`, `deselect`, `setHintingShapes`, `setErasingShapes`, `reparentShapes`, `rotateShapesBy`, `nudgeShapes`, `duplicateShapes`, `moveShapesToPage`, `toggleLock`, `sendToBack`, `sendBackward`, `bringForward`, `bringToFront`, `flipShapes`, `stackShapes`, `packShapes`, `alignShapes`, `distributeShapes`, `stretchShapes`, `groupShapes`, `ungroupShapes`, `getContentFromCurrentPage`, `getSvgElement`, `getSvgString`, `getSvg`, `toImage`
- Each occurrence: ~3 lines × 25 methods = 75 lines

### **Pattern: Shape or ShapeId to Shape Resolution**
**Found in**: 15+ methods that handle `shape: TLShape | TLShapeId` parameters

**Current Duplication**:
```typescript
const id = typeof shape === 'string' ? shape : shape.id
const actualShape = this.getShape(id)
```

**Refactoring Opportunity**:
Create utility methods:
- `private resolveShape(shape: TLShape | TLShapeId): TLShape | undefined`
- `private resolveShapeId(shape: TLShape | TLShapeId): TLShapeId`

**Lines Saved**: **~30-40 lines**
- Methods like: `isAncestorSelected`, `getShapeGeometry`, `getShapeHandles`, `getShapeLocalTransform`, `getShapePageTransform`, `getShapePageBounds`, `getShapeClipPath`, `getShapeMask`, etc.
- Each occurrence: ~2-3 lines × 15 methods = 30-45 lines

### **Pattern: Early Return Guard Clauses**
**Found in**: 60+ methods with similar null checks and early returns

**Current Duplication**:
```typescript
if (!shape) return
if (!shape) return undefined
if (!bounds) return undefined
if (ids.length <= 0) return this
```

**Refactoring Opportunity**:
Create utility methods for common guard patterns:
- `private requireShape(shape: TLShape | undefined): TLShape`
- `private requireNonEmptyArray<T>(array: T[]): boolean`
- `private requireBounds(bounds: Box | undefined): Box`

**Lines Saved**: **~60-80 lines**
- Very common pattern throughout the file
- Each guard could save 1-2 lines when consolidated

### **Pattern: Cache Creation for Shape Methods**
**Found in**: 8 methods that create computed caches

**Current Duplication**:
```typescript
@computed private _getShapeXxxCache(): ComputedCache<ReturnType, TLShape> {
    return this.store.createComputedCache('shapeName', (shape: TLShape) => {
        // computation logic
    })
}
```

**Refactoring Opportunity**:
Create a generic cache creation utility:
```typescript
private createShapeCache<T>(name: string, computation: (shape: TLShape) => T): ComputedCache<T, TLShape>
```

**Lines Saved**: **~16-24 lines**
- Found in: `_getShapeHandlesCache`, `_getShapePageTransformCache`, `_getShapePageBoundsCache`, `_getShapeClipPathCache`, `_getShapeMaskCache`, `_getShapeMaskedPageBoundsCache`, and others
- Each cache creation: ~3-4 lines × 8 caches = 24-32 lines

### **Pattern: Timeout Management**
**Found in**: 4 timeout-related methods with similar patterns

**Current Duplication**:
```typescript
private _xxxKeyTimeout = -1 as any

_setXxxKeyTimeout() {
    clearTimeout(this._xxxKeyTimeout)
    this._xxxKeyTimeout = this.timers.setTimeout(() => {
        // timeout logic
    }, timeout)
}
```

**Refactoring Opportunity**:
Create a timeout manager utility class or helper methods

**Lines Saved**: **~20-30 lines**
- Found in: `_setShiftKeyTimeout`, `_setAltKeyTimeout`, `_setCtrlKeyTimeout`, `_setMetaKeyTimeout`
- Each pattern: ~5-8 lines × 4 timeouts = 20-32 lines

### **Pattern: this.run() Wrapper Logic**
**Found in**: 12+ methods that wrap operations in `this.run()`

**Current Duplication**:
```typescript
someMethod(): this {
    this.run(() => {
        // actual logic here
    })
    return this
}
```

**Refactoring Opportunity**:
Create a decorator or higher-order method to handle the run wrapper:
```typescript
private runAndReturn<T extends any[]>(fn: (...args: T) => void): (...args: T) => this
```

**Lines Saved**: **~24-36 lines**
- Found in multiple shape manipulation methods
- Each wrapper: ~2-3 lines × 12 methods = 24-36 lines

### **Pattern: Selection-based Operations**
**Found in**: 8+ methods that operate on selected shapes with similar patterns

**Current Duplication**:
```typescript
const selectedShapeIds = this.getSelectedShapeIds()
if (selectedShapeIds.length === 0) return this
// operate on selectedShapeIds
```

**Refactoring Opportunity**:
Create utility methods:
- `private withSelectedShapes<T>(callback: (shapeIds: TLShapeId[]) => T): T | undefined`
- `private requireSelectedShapes(): TLShapeId[]`

**Lines Saved**: **~16-24 lines**
- Common pattern in selection-based operations
- Each occurrence: ~2-3 lines × 8 methods = 16-24 lines

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
1. **Editor.ts Shape Array Normalization** (**~75-90 lines saved**)
2. Create `useEventListener` hook (**~85-95 lines saved**)
3. Create event redispatch utilities (**~18-22 lines saved**)

### Phase 2: Medium-Impact Refactoring  
1. **Editor.ts Shape Resolution Utilities** (**~30-40 lines saved**)
2. **Editor.ts Cache Creation Utilities** (**~16-24 lines saved**)
3. Create shape bounds utility functions (**~40-50 lines saved**)
4. Implement base manager class patterns (**~15-25 lines saved**)
5. Create media query management hook (**~15-20 lines saved**)

### Phase 3: Polish and Optimization
1. **Editor.ts Guard Clauses** (**~60-80 lines saved**)
2. **Editor.ts Timeout Management** (**~20-30 lines saved**)
3. **Editor.ts Selection Operations** (**~16-24 lines saved**)
4. Add parameter validation utilities (**~4-6 lines saved**)
5. Create combined event utilities (**~8-12 lines saved**)
6. Review and consolidate any remaining patterns

## 📊 Updated Impact Assessment

**Total Lines of Code Reduction**: **450-570 lines**

### **Editor.ts File Alone**: **240-334 lines saved**
- **Shape Array Normalization**: 75-90 lines (highest single opportunity)
- **Shape Resolution**: 30-40 lines
- **Guard Clauses**: 60-80 lines  
- **Cache Creation**: 16-24 lines
- **Timeout Management**: 20-30 lines
- **Selection Operations**: 16-24 lines
- **Run Wrapper Logic**: 24-36 lines

### **Cross-Package Opportunities**: **210-236 lines saved**
- **High Priority**: 103-117 lines (54% of cross-package savings)
- **Medium Priority**: 70-95 lines (37% of cross-package savings)
- **Low Priority**: 17-28 lines (9% of cross-package savings)

**Breakdown by Category**:
- **Editor.ts Internal**: ~240-334 lines (largest impact)
- Event Management: ~103-117 lines
- Shape Bounds: ~40-50 lines  
- Manager Patterns: ~15-25 lines
- Media Query: ~15-20 lines
- Event Prevention: ~8-12 lines
- Hook Validation: ~4-6 lines

**Maintenance Improvement**: Significant - centralized patterns both within Editor.ts and across the package
**Testing Benefits**: Easier to test common patterns in isolation, especially Editor.ts utilities
**Performance Impact**: Minimal to none, possibly slight improvement from shared functions

## 🛠️ Recommended Next Steps

1. **Start with Editor.ts Shape Array Normalization** - highest single impact (75-90 lines), very safe change
2. **Create `useEventListener` hook** - second highest impact (85-95 lines), clear pattern
3. **Add Editor.ts Shape Resolution utilities** - clean pattern (30-40 lines), easy to test
4. **Create event redispatch utilities** - clear pattern (18-22 lines), easy to test
5. **Gradually migrate existing patterns** - one at a time to minimize risk
6. **Add comprehensive tests** for new utility functions
7. **Update documentation** to encourage use of new patterns

This analysis identified the most significant opportunities for code deduplication, with **Editor.ts alone offering 240-334 lines of savings** while maintaining current functionality and improving maintainability.