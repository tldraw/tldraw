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
- isDragging → use getIsDragging()
- isPanning → use getIsPanning()
- altKey → use getAltKey()
- shiftKey → use getShiftKey()
- ctrlKey → use getCtrlKey()
- metaKey → use getMetaKey()
