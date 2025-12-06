Files with deprecated API usage that need to be cleaned up.

Get the most recent files with

```bash
cat /tmp/lint-output.txt | sed 's/\x1b\[[0-9;]*m//g' | grep -E "^/.*/.*\.(ts|tsx)$" | sort -u)
```

apps/dotcom/client/ (2 files)

- [x] src/fairy/Fairy.tsx
- [x] src/fairy/FairyThrowTool.tsx

apps/examples/ (24 files)

- [x] e2e/tests/test-camera.spec.ts
- [x] src/examples/add-tool-to-toolbar/sticker-tool-util.tsx
- [x] src/examples/cubic-bezier-shape/CubicBezierShape.tsx
- [x] src/examples/cubic-bezier-shape/CubicBezierShapeExample.tsx
- [x] src/examples/custom-clipping-shape/CircleClipShapeTool.tsx
- [x] src/examples/custom-tool/CustomToolExample.tsx
- [x] src/examples/dynamic-tools/DynamicToolsExample.tsx
- [x] src/examples/exam-marking/add-mark-tool.tsx
- [x] src/examples/exam-marking/pdf-editor/PdfEditor.tsx
- [x] src/examples/globs-editor/GlobShapeUtil.tsx
- [x] src/examples/globs-editor/GlobTool/GlobTool.tsx
- [x] src/examples/interaction-end-callback/InteractionEndExample.tsx
- [x] src/examples/lasso-select-tool/LassoSelectTool.ts
- [x] src/examples/layer-panel/ShapeList.tsx
- [x] src/examples/only-editor/MicroSelectTool.ts
- [x] src/examples/only-editor/MiniSelectTool.ts
- [x] src/examples/pin-bindings/PinExample.tsx
- [x] src/examples/screenshot-tool/ScreenshotTool/childStates/Dragging.ts
- [x] src/examples/screenshot-tool/ScreenshotTool/childStates/Pointing.ts
- [x] src/examples/snowstorm/SnowStorm.tsx
- [x] src/examples/sticker-bindings/StickerExample.tsx
- [x] src/examples/tool-with-child-states/ToolWithChildStatesExample.tsx

packages/editor/ (6 files)

- [x] src/lib/components/GeometryDebuggingView.tsx
- [x] src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.test.ts
- [x] src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.ts
- [x] src/lib/editor/managers/TickManager/TickManager.test.ts
- [x] src/lib/editor/tools/BaseBoxShapeTool/children/Pointing.ts
- [x] src/lib/hooks/useGestureEvents.ts
- [x] src/lib/utils/rotation.ts

packages/tldraw/ (53 files)

- [x] src/lib/defaultExternalContentHandlers.ts
- [x] src/lib/shapes/arrow/arrowLabel.ts
- [x] src/lib/shapes/arrow/ArrowShapeUtil.tsx
- [x] src/lib/shapes/arrow/arrowTargetState.ts
- [x] src/lib/shapes/arrow/toolStates/Idle.tsx
- [x] src/lib/shapes/arrow/toolStates/Pointing.tsx
- [x] src/lib/shapes/bookmark/BookmarkShapeUtil.tsx
- [x] src/lib/shapes/draw/toolStates/Drawing.ts
- [x] src/lib/shapes/geo/GeoShapeUtil.tsx
- [x] src/lib/shapes/geo/toolStates/Pointing.ts
- [x] src/lib/shapes/line/toolStates/Pointing.ts
- [x] src/lib/shapes/note/toolStates/Pointing.ts
- [x] src/lib/shapes/shared/HyperlinkButton.tsx
- [x] src/lib/shapes/shared/RichTextLabel.tsx
- [x] src/lib/shapes/text/toolStates/Pointing.ts
- [x] src/lib/tools/EraserTool/childStates/Erasing.ts
- [x] src/lib/tools/EraserTool/childStates/Pointing.ts
- [x] src/lib/tools/HandTool/childStates/Dragging.ts
- [x] src/lib/tools/HandTool/childStates/Pointing.ts
- [x] src/lib/tools/HandTool/HandTool.ts
- [x] src/lib/tools/LaserTool/childStates/Lasering.ts
- [x] src/lib/tools/selection-logic/getHitShapeOnCanvasPointerDown.ts
- [x] src/lib/tools/selection-logic/selectOnCanvasPointerUp.ts
- [x] src/lib/tools/selection-logic/updateHoveredShapeId.ts
- [x] src/lib/tools/SelectTool/childStates/Brushing.ts
- [x] src/lib/tools/SelectTool/childStates/Crop/children/\*.ts (6 files)
- [x] src/lib/tools/SelectTool/childStates/DraggingHandle.tsx
- [x] src/lib/tools/SelectTool/childStates/EditingShape.ts
- [x] src/lib/tools/SelectTool/childStates/Idle.ts
- [x] src/lib/tools/SelectTool/childStates/Pointing\*.ts (7 files)
- [x] src/lib/tools/SelectTool/childStates/Resizing.ts
- [x] src/lib/tools/SelectTool/childStates/Rotating.ts
- [x] src/lib/tools/SelectTool/childStates/ScribbleBrushing.ts
- [x] src/lib/tools/SelectTool/childStates/Translating.ts
- [x] src/lib/tools/SelectTool/DragAndDropManager.ts
- [x] src/lib/tools/ZoomTool/childStates/Pointing.ts
- [x] src/lib/tools/ZoomTool/childStates/ZoomBrushing.ts
- [x] src/lib/tools/ZoomTool/ZoomTool.ts
- [x] src/lib/ui/components/ContextMenu/DefaultContextMenu.tsx
- [x] src/lib/ui/components/CursorChatBubble.tsx
- [x] src/lib/ui/components/DefaultDebugPanel.tsx
- [x] src/lib/ui/context/actions.tsx
- [x] src/lib/ui/hooks/useClipboardEvents.ts
- [x] src/lib/ui/hooks/useKeyboardShortcuts.ts
- [x] src/lib/ui/hooks/useTools.tsx
- [x] src/lib/utils/excalidraw/putExcalidrawContent.ts
- [x] src/test/arrows-megabus.test.tsx
- [x] src/test/Editor.test.tsx
- [x] src/test/spacebarPanning.test.ts
- [x] src/test/TestEditor.ts

templates/ (7 files)

- [x] agent/client/tools/TargetAreaTool.tsx
- [x] agent/client/tools/TargetShapeTool.tsx
- [x] branching-chat/client/connection/ConnectionShapeUtil.tsx
- [x] branching-chat/client/ports/PointingPort.tsx
- [x] shader/src/fluid/FluidManager.ts
- [x] workflow/src/hooks/useDragToCreate.ts
- [x] workflow/src/ports/PointingPort.tsx

Deprecated APIs being used:

- currentPagePoint → use getCurrentPagePoint()
- currentScreenPoint → use getCurrentScreenPoint()
- originPagePoint → use getOriginPagePoint()
- isDragging → use getIsDragging()
- isPanning → use getIsPanning()
- metaKey → use getMetaKey()
- ctrlKey → use getCtrlKey()
- shiftKey → use getShiftKey()
