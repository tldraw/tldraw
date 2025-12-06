Files with deprecated API usage that need to be cleaned up.

Get the most recent files with

```bash
yarn lint 2>&1 | sed 's/\x1b\[[0-9;]*m//g' | grep -E "^/.*/.*\.(ts|tsx)$" | sort -u
```

apps/dotcom/client/ (1 file)

- [x] src/fairy/FairyThrowTool.ts

apps/examples/ (11 files)

- [x] src/examples/add-tool-to-toolbar/sticker-tool-util.tsx
- [x] src/examples/custom-clipping-shape/CircleClipShapeTool.tsx
- [x] src/examples/custom-tool/CustomToolExample.tsx
- [x] src/examples/dynamic-tools/DynamicToolsExample.tsx
- [x] src/examples/interaction-end-callback/InteractionEndExample.tsx
- [x] src/examples/lasso-select-tool/LassoSelectTool.ts
- [x] src/examples/pin-bindings/PinExample.tsx
- [x] src/examples/screenshot-tool/ScreenshotTool/childStates/Dragging.ts
- [x] src/examples/snowstorm/SnowStorm.tsx
- [x] src/examples/sticker-bindings/StickerExample.tsx

packages/editor/ (2 files)

- [x] src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.test.ts
- [x] src/lib/editor/managers/TickManager/TickManager.test.ts

packages/tldraw/ (28 files)

- [x] src/lib/shapes/arrow/ArrowShapeUtil.tsx
- [x] src/lib/shapes/arrow/arrowTargetState.ts
- [x] src/lib/shapes/arrow/toolStates/Pointing.tsx
- [x] src/lib/shapes/draw/toolStates/Drawing.ts
- [x] src/lib/shapes/geo/GeoShapeUtil.tsx
- [x] src/lib/shapes/geo/toolStates/Pointing.ts
- [x] src/lib/shapes/line/toolStates/Pointing.ts
- [x] src/lib/shapes/text/toolStates/Pointing.ts
- [x] src/lib/tools/EraserTool/childStates/Erasing.ts
- [x] src/lib/tools/EraserTool/childStates/Pointing.ts
- [x] src/lib/tools/HandTool/childStates/Dragging.ts
- [x] src/lib/tools/HandTool/HandTool.ts
- [x] src/lib/tools/selection-logic/getHitShapeOnCanvasPointerDown.ts
- [x] src/lib/tools/selection-logic/selectOnCanvasPointerUp.ts
- [x] src/lib/tools/SelectTool/childStates/Brushing.ts
- [x] src/lib/tools/SelectTool/childStates/Crop/children/Cropping.ts
- [x] src/lib/tools/SelectTool/childStates/Crop/children/TranslatingCrop.ts
- [x] src/lib/tools/SelectTool/childStates/DraggingHandle.tsx
- [x] src/lib/tools/SelectTool/childStates/Idle.ts
- [x] src/lib/tools/SelectTool/childStates/PointingArrowLabel.ts
- [x] src/lib/tools/SelectTool/childStates/PointingShape.ts
- [x] src/lib/tools/SelectTool/childStates/Resizing.ts
- [x] src/lib/tools/SelectTool/childStates/Rotating.ts
- [x] src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts
- [x] src/lib/tools/SelectTool/childStates/Translating.ts
- [x] src/lib/tools/SelectTool/DragAndDropManager.ts
- [x] src/lib/tools/ZoomTool/childStates/Pointing.ts
- [x] src/lib/tools/ZoomTool/childStates/ZoomBrushing.ts
- [x] src/lib/ui/components/ContextMenu/DefaultContextMenu.tsx
- [x] src/lib/ui/context/actions.tsx
- [x] src/test/Editor.test.tsx

templates/ (2 files)

- [x] agent/client/tools/TargetShapeTool.tsx
- [x] workflow/src/hooks/useDragToCreate.ts

Deprecated APIs being used:

- currentPagePoint → use getCurrentPagePoint()
- currentScreenPoint → use getCurrentScreenPoint()
- originPagePoint → use getOriginPagePoint()
- originScreenPoint → use getOriginScreenPoint()
- previousPagePoint → use getPreviousPagePoint()
- isDragging → use getIsDragging()
- isPanning → use getIsPanning()
- isPen → use getIsPen()
- isPointing → use getIsPointing()
- pointerVelocity → use getPointerVelocity()
- altKey → use getAltKey()
- shiftKey → use getShiftKey()
- ctrlKey → use getCtrlKey()
- metaKey → use getMetaKey()

## Current lint errors (packages/tldraw)

### packages/tldraw/src/lib/shapes/arrow/arrowTargetState.ts

- Line 201:28 - `pointerVelocity` → use `getPointerVelocity()`

### packages/tldraw/src/lib/shapes/arrow/toolStates/Pointing.tsx

- Line 93:11 - `originPagePoint` → use `getOriginPagePoint()`

### packages/tldraw/src/lib/shapes/draw/toolStates/Drawing.ts

- Line 64:29 - `isPen` → use `getIsPen()`
- Line 157:24 - `isPen` → use `getIsPen()`

### packages/tldraw/src/lib/shapes/geo/toolStates/Pointing.ts

- Line 74:11 - `originPagePoint` → use `getOriginPagePoint()`

### packages/tldraw/src/lib/shapes/text/toolStates/Pointing.ts

- Line 40:11 - `isPointing` → use `getIsPointing()`

### packages/tldraw/src/lib/tools/EraserTool/childStates/Erasing.ts

- Line 29:11 - `originPagePoint` → use `getOriginPagePoint()`
- Line 102:14 - `currentPagePoint` → use `getCurrentPagePoint()`
- Line 102:32 - `previousPagePoint` → use `getPreviousPagePoint()`

### packages/tldraw/src/lib/tools/HandTool/HandTool.ts

- Line 17:12 - `currentScreenPoint` → use `getCurrentScreenPoint()`
- Line 26:12 - `currentScreenPoint` → use `getCurrentScreenPoint()`
- Line 37:15 - `currentScreenPoint` → use `getCurrentScreenPoint()`

### packages/tldraw/src/lib/tools/HandTool/childStates/Dragging.ts

- Line 32:43 - `originScreenPoint` → use `getOriginScreenPoint()`
- Line 41:11 - `pointerVelocity` → use `getPointerVelocity()`

### packages/tldraw/src/lib/tools/SelectTool/DragAndDropManager.ts

- Line 95:65 - `pointerVelocity` → use `getPointerVelocity()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/Brushing.ts

- Line 34:11 - `altKey` → use `getAltKey()`
- Line 118:14 - `originPagePoint` → use `getOriginPagePoint()`
- Line 118:31 - `currentPagePoint` → use `getCurrentPagePoint()`
- Line 118:49 - `shiftKey` → use `getShiftKey()`
- Line 118:59 - `ctrlKey` → use `getCtrlKey()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/Crop/children/Cropping.ts

- Line 86:11 - `shiftKey` → use `getShiftKey()`
- Line 152:14 - `originPagePoint` → use `getOriginPagePoint()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/Crop/children/TranslatingCrop.ts

- Line 97:11 - `originPagePoint` → use `getOriginPagePoint()`
- Line 97:28 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/DraggingHandle.tsx

- Line 289:14 - `currentPagePoint` → use `getCurrentPagePoint()`
- Line 289:32 - `shiftKey` → use `getShiftKey()`
- Line 289:42 - `ctrlKey` → use `getCtrlKey()`
- Line 289:51 - `altKey` → use `getAltKey()`
- Line 289:59 - `pointerVelocity` → use `getPointerVelocity()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/Idle.ts

- Line 75:16 - `currentPagePoint` → use `getCurrentPagePoint()`
- Line 381:16 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/PointingArrowLabel.ts

- Line 57:11 - `currentPagePoint` → use `getCurrentPagePoint()`
- Line 84:11 - `isDragging` → use `getIsDragging()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/PointingShape.ts

- Line 20:14 - `currentPagePoint` → use `getCurrentPagePoint()`
- Line 70:14 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/Resizing.ts

- Line 214:11 - `altKey` → use `getAltKey()`
- Line 214:19 - `shiftKey` → use `getShiftKey()`
- Line 479:14 - `originPagePoint` → use `getOriginPagePoint()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/Rotating.ts

- Line 167:14 - `shiftKey` → use `getShiftKey()`
- Line 167:24 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts

- Line 86:14 - `shiftKey` → use `getShiftKey()`
- Line 86:24 - `originPagePoint` → use `getOriginPagePoint()`
- Line 86:41 - `previousPagePoint` → use `getPreviousPagePoint()`
- Line 86:60 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/tools/SelectTool/childStates/Translating.ts

- Line 407:10 - `originPagePoint` → use `getOriginPagePoint()`

### packages/tldraw/src/lib/tools/ZoomTool/childStates/ZoomBrushing.ts

- Line 33:14 - `originPagePoint` → use `getOriginPagePoint()`
- Line 33:31 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/tools/selection-logic/getHitShapeOnCanvasPointerDown.ts

- Line 10:13 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/tools/selection-logic/selectOnCanvasPointerUp.ts

- Line 8:10 - `currentPagePoint` → use `getCurrentPagePoint()`

### packages/tldraw/src/lib/ui/components/ContextMenu/DefaultContextMenu.tsx

- Line 70:17 - `currentPagePoint` → use `getCurrentPagePoint()`
