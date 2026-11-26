# Editor plugins

The editor is a small core plus plugins. The core holds the store and history, shape, binding and asset records and their operations, pages, selection and the other page state, styles, the state chart, and the plugin host. Plugins add everything else, including the camera and event dispatch. See [What is a plugin](#what-is-a-plugin) for the full list.

```ts
const editor = createEditor({
	plugins: [...createKernelPlugins(), approximateTextMeasurementPlugin(), myShapesPlugin],
})
```

`createEditor` installs only the plugins that it gets. It needs no DOM. Its module graph (`plugins/createEditor.ts`, the `Editor` class and the kernel plugins) loads no React, and `noReact.test.ts` checks this. The package entry still loads React, because it also exports the React layer, and `@tldraw/editor` still depends on React. A separate headless entry or package is step 2 below.

## The model

A plugin (`definePlugin`) can:

- declare **records** statically: `shapeUtils`, `bindingUtils`, `tools`. The store schema needs them before the store exists. `createEditor` builds the store from them.
- **provide a capability** (`defineCapability<T>`): a typed service, for example `textMeasurementCapability`. Exactly one plugin provides each capability. Several plugins can implement the same capability, for example DOM and approximate text measurement.
- **require** or **optionally use** capabilities. The host sets up providers first. A missing provider, a duplicate id, two providers of one capability, a dependency cycle, and an undeclared `ctx.get` all throw when the editor is created.
- **contribute to a slot** (`defineSlot<T>`): an extension point. The plugin that owns a behavior owns its slot. Other plugins contribute to it, with `before` and `after` constraints on other plugin ids. The owner runs the contributions as a `pipe` (transform a value) or a `chain` (first handler that does not call `next` wins). Slots are reactive, so a computed that reads one updates when contributions change.
- run cleanup with `ctx.onDispose`. Disposers run in reverse setup order.

Public APIs stay on the editor or as free functions over it. The host does not merge plugin APIs into the editor type.

## Compatibility: the old interface is a layer over plugins

`plugins` is the complete list of plugins that an editor installs. When you leave it out, `new Editor()` and `TldrawEditor` install `createDefaultPlugins()`. That is `createKernelPlugins()`, which needs no DOM, plus the browser and React plugins. To add plugins, spread the defaults: `plugins: [...createDefaultPlugins(), myPlugin]`. To replace one, filter it out by id and add yours. Two plugins that provide the same capability throw, so a duplicate is never silent. A list without the defaults, such as `[myPlugin]`, gives an editor without a frame loop, DOM focus or React group rendering.

The old members are facades over the plugins. They stay plain fields. When no plugin provides the capability, the field holds a stub that throws a "no installed plugin provides" error when it is used.

| Old API                                                                                                             | Now                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `editor.snaps`                                                                                                      | `snappingCapability`, from `snappingPlugin`                                                                            |
| the camera and viewport (`getCamera`, `setCamera`, `zoomIn`, `screenToPage`, `startFollowingUser` and the others)   | `cameraCapability`, from `cameraPlugin`                                                                                |
| `dispatch` and the event pipeline (panning, pinch, wheel, modifier keys, long press)                                | `eventDispatchCapability`, from `eventDispatchPlugin`                                                                  |
| `flipShapes`, `stackShapes`, `packShapes`, `alignShapes`, `distributeShapes`, `stretchShapes`, `resizeToBounds`     | `shapeArrangementCapability`, from `shapeArrangementPlugin`                                                            |
| `animateShape`, `animateShapes`                                                                                     | `shapeAnimationCapability`, from `shapeAnimationPlugin`                                                                |
| `getSharedStyles`, `getSharedOpacity`, `setStyleForSelectedShapes` and the other style setters                      | `stylesCapability`, from `stylesPlugin`                                                                                |
| `getContentFromCurrentPage`, `putContentOntoCurrentPage`, `resolveAssetsInContent`                                  | `contentTransferCapability`, from `contentTransferPlugin`                                                              |
| `select`, `selectAll`, `selectNone`, `getSelectionPageBounds`, `setFocusedGroup` and the other selection operations | `selectionCapability`, from `selectionPlugin`                                                                          |
| `setEditingShape`, `canEditShape`, `setCroppingShape`, `getRichTextEditor`                                          | `editingCapability`, from `editingPlugin`                                                                              |
| `editor.user`                                                                                                       | `userPreferencesCapability`, from `userPreferencesPlugin`                                                              |
| `getCurrentTheme`, `getColorMode` and the other theme methods                                                       | `themesCapability`, from `themesPlugin`                                                                                |
| `editor.inputs`                                                                                                     | `inputsCapability`, from `inputsPlugin`                                                                                |
| double, triple and quadruple clicks                                                                                 | `clickDetectionCapability`, from `clickDetectionPlugin`                                                                |
| hit testing (`getShapeAtPoint`, `getShapesAtPoint`) and brushing                                                    | `spatialIndexCapability`, from `spatialIndexPlugin`                                                                    |
| `editor.scribbles`                                                                                                  | `scribblesCapability`, from `scribblesPlugin`                                                                          |
| `editor.edgeScrollManager`                                                                                          | `edgeScrollCapability`, from `edgeScrollPlugin`                                                                        |
| `editor.overlays`                                                                                                   | `overlaysCapability`, from `overlaysPlugin`                                                                            |
| `editor.collaborators`, `getCollaborators`                                                                          | `collaboratorsCapability`, from `collaboratorsPlugin`                                                                  |
| `editor.performance`                                                                                                | `performanceCapability`, from `performancePlugin`. Without it, the editor emits no performance events.                 |
| `editor.fonts`                                                                                                      | `fontsCapability`, from `domFontsPlugin`. Without it, the editor renders and exports without waiting for fonts.        |
| `editor.textMeasure`                                                                                                | `textMeasurementCapability`, from `domTextMeasurementPlugin`                                                           |
| `registerExternalContentHandler`, `putExternalContent`, `externalContentHandlers`, asset handlers                   | `externalContentCapability`, from `externalContentPlugin`. The legacy handler map is the end of `externalContentSlot`. |
| `editor.focus()` and `editor.blur()` container focus                                                                | `containerFocusCapability`, from `domFocusPlugin`. The focused state stays in instance data.                           |
| the frame loop (`tick` and `frame` events)                                                                          | `animationFrameTickPlugin`. A headless editor gets ticks only when the caller emits them.                              |
| `getSvgElement`                                                                                                     | `svgExportCapability`, from `reactSvgExportPlugin`                                                                     |
| `getSvgString`, `toImage`, `toImageDataUrl`                                                                         | `imageExportCapability`, from `domImageExportPlugin`, which builds on `getSvgElement`                                  |
| `ShapeUtil.canSnap`                                                                                                 | the initial value of `canSnapToShapeSlot`                                                                              |
| `ShapeUtil.component`                                                                                               | the fallback when `shapeComponentSlot` has no contribution for the shape type                                          |

`createDefaultPlugins` lives in the React layer (`react/defaultPlugins.ts`), because it includes the React plugins. `TldrawEditor` calls it directly. For a direct `new Editor()`, the package entry registers it with `setDefaultEditorPlugins`. This is a provisional seam until the kernel moves to its own package.

## React is an output layer

The `react/` folder is the only place in this design that imports React. `reactRenderingPlugins` contributes the group shape component (`GroupShapeUtil` now has no JSX) and provides SVG export. `components/Shape.tsx` renders through `shapeComponentSlot`.

## Next steps

1. Move each default shape's `component`, `toSvg` and `backgroundComponent` into `shapeComponentSlot` contributions. Then `ShapeUtil` has no render methods and shape utils are headless.
2. Move the kernel (`editor/`, `plugins/`, `primitives/`, `config/`) to its own package with no React dependency. The `@tldraw/editor` package then re-exports it with the React layer, and `setDefaultEditorPlugins` goes away.
3. Lift more of the editor the same way, for example deep links, grouping and duplication, and the page operations.

## Shapes and tools in `tldraw`

`packages/tldraw` declares each default shape as a plugin, in `defaultShapePlugins`. A shape plugin has the shape util, the tool that creates the shape, and the bindings that the shape owns, so the `arrowShape` plugin also has the arrow binding. `defaultToolPlugins` has the tools that do not create a shape: select, hand, eraser, laser and zoom. `createTldrawPlugins()` is `createDefaultPlugins()` plus both lists, and `<Tldraw>` and `TestEditor` install it when they get no `plugins`.

The `shapeUtils`, `bindingUtils` and `tools` options replace a plugin record of the same type or id (`resolvePluginRecords`), so `shapeUtils={[MyGeoShapeUtil]}` replaces the geo util and keeps the geo tool. Two plugins that declare the same type throw. `defaultShapeUtils`, `defaultBindingUtils`, `defaultShapeTools` and `defaultTools` stay as typed lists for code that builds a store or an editor from them; a test checks that they match the plugins.

Each of these plugins also contributes its tool items to the UI through `uiToolItemsSlot`. A tool item is defined once, and the toolbar, the keyboard shortcuts, the shortcuts dialog and the command palette all use it. Where an item appears in the toolbar is a separate contribution, to `uiToolbarSlot`. The default toolbar shows its built-in layout first, then the plugin placements. A plugin that is left out takes its tool item, toolbar button and shortcut with it. For an editor that gets its tools from options instead of plugins, `useTools` falls back to the built-in tool items for the tools the editor has.

The plugins contribute their actions the same way, through `uiActionItemsSlot`: for example, the geo plugin has `select-geo-tool` and the frame plugin has `frame-selection`. An action that only works with a default shape or tool belongs to that shape's or tool's plugin. Actions that work with any shape, such as `download-original` for images and videos, stay built in. The action map keeps its usual order: a plugin action takes the place of the built-in action with its id, and other plugin actions come last. Menus place actions by id, and a menu item for an action that no plugin defines shows nothing. For an editor without the tldraw plugins, `useActions` falls back to the built-in actions for the shapes and tools the editor has. The default paste and drop handlers still create text, bookmark and embed shapes.

The shape utils still import React for their components, so the shape plugins are not headless. Next step 1 removes that.

## What is a plugin

| Feature                                                         | Where                                                      | Plugin                              |
| --------------------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| Store, history, undo and redo                                   | core                                                       |                                     |
| Shape, binding and asset records and their operations           | core                                                       |                                     |
| Pages and page state: selected, hovered, editing ids            | core                                                       |                                     |
| Styles for the next shape, document settings, instance state    | core                                                       |                                     |
| The state chart                                                 | core                                                       | tools come from plugins and options |
| Rendering shapes and culling                                    | core                                                       |                                     |
| User preferences                                                | kernel plugin                                              | `userPreferencesPlugin`             |
| Themes                                                          | kernel plugin                                              | `themesPlugin`                      |
| Camera, viewport, zooming, animation, following                 | kernel plugin                                              | `cameraPlugin`                      |
| Event dispatch: batching, panning, pinch, wheel, modifier keys  | kernel plugin                                              | `eventDispatchPlugin`               |
| Input state                                                     | kernel plugin                                              | `inputsPlugin`                      |
| Double, triple and quadruple clicks                             | kernel plugin                                              | `clickDetectionPlugin`              |
| Hit testing and brushing (spatial index)                        | kernel plugin                                              | `spatialIndexPlugin`                |
| Snapping                                                        | kernel plugin                                              | `snappingPlugin`                    |
| Scribbles                                                       | kernel plugin                                              | `scribblesPlugin`                   |
| Edge scrolling                                                  | kernel plugin                                              | `edgeScrollPlugin`                  |
| Overlays                                                        | kernel plugin                                              | `overlaysPlugin`                    |
| Collaborators                                                   | kernel plugin                                              | `collaboratorsPlugin`               |
| Performance events                                              | kernel plugin                                              | `performancePlugin`                 |
| External content (paste, drop, embeds)                          | kernel plugin                                              | `externalContentPlugin`             |
| Shared styles and style setters                                 | kernel plugin                                              | `stylesPlugin`                      |
| Copy and paste content (duplicate page and move to page use it) | kernel plugin                                              | `contentTransferPlugin`             |
| Selection operations, selection bounds, focused group           | kernel plugin                                              | `selectionPlugin`                   |
| Editing and cropping a shape, the rich text editor              | kernel plugin                                              | `editingPlugin`                     |
| Text measurement                                                | DOM plugin, or `approximateTextMeasurementPlugin` headless | `domTextMeasurementPlugin`          |
| Fonts                                                           | DOM plugin                                                 | `domFontsPlugin`                    |
| Container focus                                                 | DOM plugin                                                 | `domFocusPlugin`                    |
| Frame loop                                                      | DOM plugin                                                 | `animationFrameTickPlugin`          |
| Image export                                                    | DOM plugin                                                 | `domImageExportPlugin`              |
| SVG export and group rendering                                  | React plugins                                              | `reactRenderingPlugins`             |
| Default shapes, with their tools and bindings                   | `tldraw` plugins                                           | `defaultShapePlugins`               |
| Select, hand, eraser, laser and zoom tools                      | `tldraw` plugins                                           | `defaultToolPlugins`                |
