# Editor plugins

The editor is a small core plus plugins. The core holds the store, history, camera, shape and binding records, the state chart, and the plugin host. Plugins add everything else.

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

| Old API                                                                                           | Now                                                                                                                    |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `editor.snaps`                                                                                    | `snappingCapability`, from `snappingPlugin`                                                                            |
| `editor.user`                                                                                     | `userPreferencesCapability`, from `userPreferencesPlugin`                                                              |
| `getCurrentTheme`, `getColorMode` and the other theme methods                                     | `themesCapability`, from `themesPlugin`                                                                                |
| `editor.inputs`                                                                                   | `inputsCapability`, from `inputsPlugin`                                                                                |
| double, triple and quadruple clicks                                                               | `clickDetectionCapability`, from `clickDetectionPlugin`                                                                |
| hit testing (`getShapeAtPoint`, `getShapesAtPoint`) and brushing                                  | `spatialIndexCapability`, from `spatialIndexPlugin`                                                                    |
| `editor.scribbles`                                                                                | `scribblesCapability`, from `scribblesPlugin`                                                                          |
| `editor.edgeScrollManager`                                                                        | `edgeScrollCapability`, from `edgeScrollPlugin`                                                                        |
| `editor.overlays`                                                                                 | `overlaysCapability`, from `overlaysPlugin`                                                                            |
| `editor.collaborators`, `getCollaborators`                                                        | `collaboratorsCapability`, from `collaboratorsPlugin`                                                                  |
| `editor.performance`                                                                              | `performanceCapability`, from `performancePlugin`. Without it, the editor emits no performance events.                 |
| `editor.fonts`                                                                                    | `fontsCapability`, from `domFontsPlugin`. Without it, the editor renders and exports without waiting for fonts.        |
| `editor.textMeasure`                                                                              | `textMeasurementCapability`, from `domTextMeasurementPlugin`                                                           |
| `registerExternalContentHandler`, `putExternalContent`, `externalContentHandlers`, asset handlers | `externalContentCapability`, from `externalContentPlugin`. The legacy handler map is the end of `externalContentSlot`. |
| `editor.focus()` and `editor.blur()` container focus                                              | `containerFocusCapability`, from `domFocusPlugin`. The focused state stays in instance data.                           |
| the frame loop (`tick` and `frame` events)                                                        | `animationFrameTickPlugin`. A headless editor gets ticks only when the caller emits them.                              |
| `getSvgElement`                                                                                   | `svgExportCapability`, from `reactSvgExportPlugin`                                                                     |
| `getSvgString`, `toImage`, `toImageDataUrl`                                                       | `imageExportCapability`, from `domImageExportPlugin`, which builds on `getSvgElement`                                  |
| `ShapeUtil.canSnap`                                                                               | the initial value of `canSnapToShapeSlot`                                                                              |
| `ShapeUtil.component`                                                                             | the fallback when `shapeComponentSlot` has no contribution for the shape type                                          |

`createDefaultPlugins` lives in the React layer (`react/defaultPlugins.ts`), because it includes the React plugins. `TldrawEditor` calls it directly. For a direct `new Editor()`, the package entry registers it with `setDefaultEditorPlugins`. This is a provisional seam until the kernel moves to its own package.

## React is an output layer

The `react/` folder is the only place in this design that imports React. `reactRenderingPlugins` contributes the group shape component (`GroupShapeUtil` now has no JSX) and provides SVG export. `components/Shape.tsx` renders through `shapeComponentSlot`.

## Next steps

1. Move each default shape's `component`, `toSvg` and `backgroundComponent` into `shapeComponentSlot` contributions. Then `ShapeUtil` has no render methods and shape utils are headless.
2. Move the kernel (`editor/`, `plugins/`, `primitives/`, `config/`) to its own package with no React dependency. The `@tldraw/editor` package then re-exports it with the React layer, and `setDefaultEditorPlugins` goes away.
3. Lift the camera and the event pipeline the same way.
4. Turn shapes, bindings and tools into plugins in `packages/tldraw`, so that `defaultShapeUtils` becomes a list of plugins.
