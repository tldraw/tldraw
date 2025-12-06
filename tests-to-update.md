# Tests to Update

We have made significant changes to the `Editor.inputs` API. Read the current branch's changes to the Editor and InputsManager files in the editor package. Every test will need to be reviewed.

1. Read the test
2. Update any deprecated calls, such as `editor.inputs.currentPagePoint.x` -> `editor.inputs.getCurrentPagePoint().x`.
3. If tests are extensively reading private data, consider whether to remove those tests.
4. If tests are attempting to write private data, consider using actual events (ie the Editor's actual public APIs) to set that data instead.
5. Test ONLY the file that you are editing. Do not run the full test suite.

## `packages/editor/src/lib/editor/`

- [ ] `src/lib/editor/managers/EdgeScrollManager/EdgeScrollManager.test.ts`
- [ ] `src/lib/editor/managers/TickManager/TickManager.test.ts`
- [ ] `src/lib/utils/sync/TLLocalSyncClient.test.ts`
- [ ] `src/lib/utils/sync/LocalIndexedDb.test.ts`
- [ ] `src/lib/utils/dom.test.ts`
- [ ] `src/lib/test/user.test.ts`
- [ ] `src/lib/primitives/intersect.test.ts`
- [ ] `src/lib/primitives/geometry/Geometry2d.test.ts`
- [ ] `src/lib/primitives/geometry/CubicBezier2d.test.ts`
- [ ] `src/lib/primitives/Vec.test.ts`
- [ ] `src/lib/primitives/Box.test.ts`
- [ ] `src/lib/license/LicenseManager.test.ts`
- [ ] `src/lib/exports/getSvgJsx.test.ts`
- [ ] `src/lib/editor/tools/StateNode.test.ts`
- [ ] `src/lib/editor/managers/UserPreferencesManager/UserPreferencesManager.test.ts`
- [ ] `src/lib/editor/managers/TextManager/TextManager.test.ts`
- [ ] `src/lib/editor/managers/SnapManager/SnapManager.test.ts`
- [ ] `src/lib/editor/managers/ScribbleManager/ScribbleManager.test.ts`
- [ ] `src/lib/editor/managers/HistoryManager/HistoryManager.test.ts`
- [ ] `src/lib/editor/managers/FontManager/FontManager.test.ts`
- [ ] `src/lib/editor/managers/FocusManager/FocusManager.test.ts`
- [ ] `src/lib/editor/managers/ClickManager/ClickManager.test.ts`
- [ ] `src/lib/editor/Editor.test.ts`
- [ ] `src/lib/config/TLEditorSnapshot.test.ts`
- [ ] `src/lib/utils/deepLinks.test.ts`
- [ ] `src/lib/exports/parseCss.test.ts`
- [ ] `src/lib/primitives/utils.test.ts`
- [ ] `src/lib/primitives/geometry/Stadium2d.test.ts`
- [ ] `src/lib/primitives/geometry/Rectangle2d.test.ts`
- [ ] `src/lib/primitives/geometry/Polyline.test.ts`
- [ ] `src/lib/primitives/geometry/Polygon2d.test.ts`
- [ ] `src/lib/primitives/geometry/Point2d.test.ts`
- [ ] `src/lib/primitives/geometry/Group2d.test.ts`
- [ ] `src/lib/primitives/geometry/Ellipse2d.test.ts`
- [ ] `src/lib/primitives/geometry/Edge2d.test.ts`
- [ ] `src/lib/primitives/geometry/CubicSpline2d.test.ts`
- [ ] `src/lib/primitives/geometry/Circle2d.test.ts`
- [ ] `src/lib/primitives/geometry/Arc2d.test.ts`
- [ ] `src/lib/primitives/Mat.test.ts`

## `packages/tldraw/`

- [ ] `src/test/spacebarPanning.test.ts`
- [ ] `src/test/selection-omnibus.test.ts`
- [ ] `src/test/modifiers.test.ts`
- [ ] `src/test/commands/setCamera.test.ts`
- [ ] `src/lib/shapes/note/noteCloning.test.ts`
- [ ] `src/lib/shapes/arrow/ArrowShapeTool.test.ts`
- [ ] `src/lib/shapes/arrow/ArrowShapeOptions.test.ts`
- [ ] `src/test/translating.test.ts`
- [ ] `src/test/text.test.ts`
- [ ] `src/test/styles3.test.ts`
- [ ] `src/test/shapeutils.test.ts`
- [ ] `src/test/resizing.test.ts`
- [ ] `src/test/perf/perf.test.ts`
- [ ] `src/test/panning.test.ts`
- [ ] `src/test/navigation.test.ts`
- [ ] `src/test/maxShapes.test.ts`
- [ ] `src/test/inner-outer-margin.test.ts`
- [ ] `src/test/getShapeAtPoint.test.ts`
- [ ] `src/test/frames.test.ts`
- [ ] `src/test/flipShapes.test.ts`
- [ ] `src/test/duplicate.test.ts`
- [ ] `src/test/drawing.test.ts`
- [ ] `src/test/custom-clipping.test.ts`
- [ ] `src/test/cropping.test.ts`
- [ ] `src/test/crop.test.ts`
- [ ] `src/test/commands/updateShapes.test.ts`
- [ ] `src/test/commands/updateShape.test.ts`
- [ ] `src/test/commands/stackShapes.test.ts`
- [ ] `src/test/commands/setCurrentPage.test.ts`
- [ ] `src/test/commands/rotateShapes.test.ts`
- [ ] `src/test/commands/resizeShape.test.ts`
- [ ] `src/test/commands/putContent.test.ts`
- [ ] `src/test/commands/packShapes.test.ts`
- [ ] `src/test/commands/nudge.test.ts`
- [ ] `src/test/commands/lockShapes.test.ts`
- [ ] `src/test/commands/isShapeOfType.test.ts`
- [ ] `src/test/commands/getSvgString.test.ts`
- [ ] `src/test/commands/deleteShapes.test.ts`
- [ ] `src/test/commands/deletePage.test.ts`
- [ ] `src/test/commands/createShapes.test.ts`
- [ ] `src/test/commands/createShape.test.ts`
- [ ] `src/test/commands/clipboard.test.ts`
- [ ] `src/test/commands/centerOnPoint.test.ts`
- [ ] `src/test/commands/cameraState.test.ts`
- [ ] `src/test/commands/animationSpeed.test.ts`
- [ ] `src/test/bookmark-shapes.test.ts`
- [ ] `src/test/ZoomTool.test.ts`
- [ ] `src/test/TLUserPreferences.test.ts`
- [ ] `src/test/SelectTool.test.ts`
- [ ] `src/test/ImageShapeUtil.test.ts`
- [ ] `src/test/HighlightShape.test.ts`
- [ ] `src/test/HandTool.test.ts`
- [ ] `src/test/EraserTool.test.ts`
- [ ] `src/test/ClickManager.test.ts`
- [ ] `src/lib/utils/embeds/embeds.test.ts`
- [ ] `src/lib/shapes/text/TextShapeTool.test.ts`
- [ ] `src/lib/shapes/note/NoteShapeTool.test.ts`
- [ ] `src/lib/shapes/line/LineShapeTool.test.ts`
- [ ] `src/lib/shapes/geo/GeoShapeTool.test.ts`
- [ ] `src/lib/shapes/draw/DrawShapeTool.test.ts`
- [ ] `src/lib/shapes/arrow/elbow/routes/ElbowArrowWorkingInfo.test.ts`
- [ ] `src/lib/shapes/arrow/ArrowShapeUtil.test.ts`
- [ ] `src/test/viewport-following.test.ts`
- [ ] `src/test/strange-tools.test.ts`
- [ ] `src/test/rotating.test.ts`
- [ ] `src/test/grid-align-on-create.test.ts`
- [ ] `src/test/commands/zoomToSelection.test.ts`
- [ ] `src/test/commands/zoomToBounds.test.ts`
- [ ] `src/test/commands/zoomOut.test.ts`
- [ ] `src/test/commands/zoomIn.test.ts`
- [ ] `src/test/commands/reparentShapesById.test.ts`
- [ ] `src/test/commands/reorderShapes.test.ts`
- [ ] `src/test/commands/penmode.test.ts`
- [ ] `src/test/commands/zoomToFit.test.ts`
- [ ] `src/test/commands/setSelectedIds.test.ts`
- [ ] `src/test/commands/resetZoom.test.ts`
- [ ] `src/test/commands/pan.test.ts`
- [ ] `src/test/commands/moveShapesToPage.test.ts`
- [ ] `src/test/commands/createPage.test.ts`
- [ ] `src/test/cleanup.test.ts`
- [ ] `src/test/TLSessionStateSnapshot.test.ts`
- [ ] `src/lib/utils/tldr/buildFromV1Document.test.ts`
- [ ] `src/test/shapeIdsInCurrentPage.test.ts`
- [ ] `src/test/resizeBox.test.ts`
- [ ] `src/test/paste.test.ts`
- [ ] `src/test/parentsToChildrenWithIndexes.test.ts`
- [ ] `src/test/middleMouseButtonPanning.test.ts`
- [ ] `src/test/commands/updateViewportPageBounds.test.ts`
- [ ] `src/test/commands/ungroup.test.ts`
- [ ] `src/test/commands/setStyle.test.ts`
- [ ] `src/test/commands/setSettings.test.ts`
- [ ] `src/test/commands/setSelectedTool.test.ts`
- [ ] `src/test/commands/setPageState.test.ts`
- [ ] `src/test/commands/setBrush.test.ts`
- [ ] `src/test/commands/screenToPage.test.ts`
- [ ] `src/test/commands/pinch.test.ts`
- [ ] `src/test/commands/pageToScreen.test.ts`
- [ ] `src/test/commands/interrupt.test.ts`
- [ ] `src/test/commands/groupShapes.test.ts`
- [ ] `src/test/commands/getInitialZoom.test.ts`
- [ ] `src/test/commands/getInitialMetaForShape.test.ts`
- [ ] `src/test/commands/getContent.test.ts`
- [ ] `src/test/commands/getBaseZoom.test.ts`
- [ ] `src/test/commands/duplicatePage.test.ts`
- [ ] `src/test/commands/complete.test.ts`
- [ ] `src/test/commands/cancel.test.ts`
- [ ] `src/test/commands/blur.test.ts`
- [ ] `src/test/commands/animateToShape.test.ts`
- [ ] `src/test/commands/animateShapes.test.ts`
- [ ] `src/test/commands/allShapesCommonBounds.test.ts`
- [ ] `src/test/assets.test.ts`
- [ ] `src/test/TestEditor.test.ts`
- [ ] `src/test/LaserTool.test.ts`
- [ ] `src/lib/utils/text/text.test.ts`
- [ ] `src/lib/shapes/highlight/HighlightShapeTool.test.ts`
- [ ] `src/lib/shapes/frame/FrameShapeTool.test.ts`

## `packages/utils/`

- [ ] `src/lib/warn.test.ts`
- [ ] `src/lib/version.test.ts`
- [ ] `src/lib/value.test.ts`
- [ ] `src/lib/url.test.ts`
- [ ] `src/lib/timers.test.ts`
- [ ] `src/lib/storage.test.ts`
- [ ] `src/lib/sort.test.ts`
- [ ] `src/lib/retry.test.ts`
- [ ] `src/lib/reordering.test.ts`
- [ ] `src/lib/object.test.ts`
- [ ] `src/lib/number.test.ts`
- [ ] `src/lib/network.test.ts`
- [ ] `src/lib/media/webp.test.ts`
- [ ] `src/lib/media/media.test.ts`
- [ ] `src/lib/media/gif.test.ts`
- [ ] `src/lib/media/avif.test.ts`
- [ ] `src/lib/media/apng.test.ts`
- [ ] `src/lib/iterable.test.ts`
- [ ] `src/lib/id.test.ts`
- [ ] `src/lib/hash.test.ts`
- [ ] `src/lib/file.test.ts`
- [ ] `src/lib/error.test.ts`
- [ ] `src/lib/debounce.test.ts`
- [ ] `src/lib/control.test.ts`
- [ ] `src/lib/cache.test.ts`
- [ ] `src/lib/bind.test.ts`
- [ ] `src/lib/array.test.ts`
- [ ] `src/lib/PerformanceTracker.test.ts`
- [ ] `src/lib/ExecutionQueue.test.ts`

## `packages/tlschema/`

- [ ] `src/translations/translations.test.ts`
- [ ] `src/styles/TLColorStyle.test.ts`
- [ ] `src/store-migrations.test.ts`
- [ ] `src/shapes/TLVideoShape.test.ts`
- [ ] `src/shapes/TLTextShape.test.ts`
- [ ] `src/shapes/TLNoteShape.test.ts`
- [ ] `src/shapes/TLLineShape.test.ts`
- [ ] `src/shapes/TLImageShape.test.ts`
- [ ] `src/shapes/TLHighlightShape.test.ts`
- [ ] `src/shapes/TLGroupShape.test.ts`
- [ ] `src/shapes/TLGeoShape.test.ts`
- [ ] `src/shapes/TLFrameShape.test.ts`
- [ ] `src/shapes/TLEmbedShape.test.ts`
- [ ] `src/shapes/TLDrawShape.test.ts`
- [ ] `src/shapes/TLBookmarkShape.test.ts`
- [ ] `src/shapes/TLBaseShape.test.ts`
- [ ] `src/shapes/TLArrowShape.test.ts`
- [ ] `src/shapes/ShapeWithCrop.test.ts`
- [ ] `src/recordsWithProps.test.ts`
- [ ] `src/records/TLShape.test.ts`
- [ ] `src/records/TLRecord.test.ts`
- [ ] `src/records/TLPresence.test.ts`
- [ ] `src/records/TLPointer.test.ts`
- [ ] `src/records/TLPageState.test.ts`
- [ ] `src/records/TLPage.test.ts`
- [ ] `src/records/TLInstance.test.ts`
- [ ] `src/records/TLDocument.test.ts`
- [ ] `src/records/TLCamera.test.ts`
- [ ] `src/records/TLBinding.test.ts`
- [ ] `src/records/TLAsset.test.ts`
- [ ] `src/misc/id-validator.test.ts`
- [ ] `src/migrations.test.ts`
- [ ] `src/createTLSchema.test.ts`
- [ ] `src/createPresenceStateDerivation.test.ts`
- [ ] `src/bindings/TLArrowBinding.test.ts`
- [ ] `src/assets/TLVideoAsset.test.ts`
- [ ] `src/assets/TLImageAsset.test.ts`
- [ ] `src/assets/TLBookmarkAsset.test.ts`
- [ ] `src/TLStore.test.ts`
- [ ] `src/misc/TLRichText.test.ts`

## `packages/store/`

- [ ] `src/lib/test/validateMigrations.test.ts`
- [ ] `src/lib/test/sortMigrations.test.ts`
- [ ] `src/lib/test/recordStore.test.ts`
- [ ] `src/lib/test/migrationCaching.test.ts`
- [ ] `src/lib/test/dependsOn.test.ts`
- [ ] `src/lib/test/AtomMap.test.ts`
- [ ] `src/lib/setUtils.test.ts`
- [ ] `src/lib/migrate.test.ts`
- [ ] `src/lib/executeQuery.test.ts`
- [ ] `src/lib/devFreeze.test.ts`
- [ ] `src/lib/StoreSideEffects.test.ts`
- [ ] `src/lib/StoreSchema.test.ts`
- [ ] `src/lib/StoreQueries.test.ts`
- [ ] `src/lib/Store.test.ts`
- [ ] `src/lib/RecordsDiff.test.ts`
- [ ] `src/lib/IncrementalSetConstructor.test.ts`
- [ ] `src/lib/ImmutableMap.test.ts`
- [ ] `src/lib/BaseRecord.test.ts`
- [ ] `src/lib/test/recordType.test.ts`
- [ ] `src/lib/test/upgradeSchema.test.ts`
- [ ] `src/lib/test/migratePersistedRecord.test.ts`
- [ ] `src/lib/test/validate.test.ts`
- [ ] `src/lib/test/recordStoreQueries.test.ts`
- [ ] `src/lib/test/recordStoreFuzzing.test.ts`
- [ ] `src/lib/test/migrate.test.ts`
- [ ] `src/lib/test/getMigrationsSince.test.ts`
- [ ] `src/lib/test/createMigrations.test.ts`

## `packages/sync/`

- [ ] `src/useSyncDemo.test.ts`
- [ ] `src/index.test.ts`

## `packages/validate/`

- [ ] `src/test/validation.test.ts`
- [ ] `src/test/validation.fuzz.test.ts`

## `packages/worker-shared/`

- [ ] `src/sentry.test.ts`
- [ ] `src/index.test.ts`
- [ ] `src/bookmarks.test.ts`

## `apps/dotcom/sync-worker/`

- [ ] `src/snapshotUtils.test.ts`
- [ ] `src/replicator/replicatorMigrations.test.ts`
- [ ] `src/replicator/pruneTopicSubscriptions.test.ts`
- [ ] `src/replicator/getResumeType.test.ts`
- [ ] `src/replicator/Subscription.test.ts`
- [ ] `src/replicator/ChangeCollator.test.ts`
- [ ] `src/fetchEverythingSql.test.ts`
- [ ] `src/AlarmScheduler.test.ts`

## `apps/dotcom/client/`

- [ ] `src/fairy/fairy-app/managers/__test__/FairyAppWaitManager.test.ts`
- [ ] `src/fairy/fairy-app/managers/__test__/FairyAppTaskListManager.test.ts`
- [ ] `src/fairy/fairy-app/managers/__test__/FairyAppProjectsManager.test.ts`
- [ ] `src/fairy/fairy-app/managers/__test__/FairyAppPersistenceManager.test.ts`
- [ ] `src/fairy/fairy-app/managers/__test__/FairyAppFollowingManager.test.ts`
- [ ] `src/fairy/fairy-app/managers/__test__/FairyAppAgentsManager.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/UpdateActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/ThinkActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/StackActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/SendToBackActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/RotateActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/ReviewActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/ResizeActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/PlaceActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/PenActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/MovePositionActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/MoveActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/MessageActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/LabelActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/FlyToBoundsActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/DistributeActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/DeleteActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/CreatePageActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/CreateActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/ChangePageActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/BringToFrontActionUtil.test.ts`
- [ ] `src/fairy/fairy-actions/__test__/AlignActionUtil.test.ts`
- [ ] `src/utils/multiplayerAssetStore.test.ts`

## `apps/analytics/`

- [ ] `src/state/state.test.ts`

## `apps/bemo-worker/`

- [ ] `src/worker.test.ts`
