// This module is part of the headless core. It must not import React or touch the DOM.
import { cameraPlugin } from './builtin/camera'
import { clickDetectionPlugin } from './builtin/clickDetection'
import { collaboratorsPlugin } from './builtin/collaborators'
import { contentTransferPlugin } from './builtin/contentTransfer'
import { deepLinksPlugin } from './builtin/deepLinks'
import { duplicationPlugin } from './builtin/duplication'
import { edgeScrollPlugin } from './builtin/edgeScroll'
import { editingPlugin } from './builtin/editing'
import { eventDispatchPlugin } from './builtin/eventDispatch'
import { externalContentPlugin } from './builtin/externalContent'
import { groupingPlugin } from './builtin/grouping'
import { inputsPlugin } from './builtin/inputs'
import { overlaysPlugin } from './builtin/overlays'
import { performancePlugin } from './builtin/performance'
import { scribblesPlugin } from './builtin/scribbles'
import { selectionPlugin } from './builtin/selection'
import { shapeAnimationPlugin } from './builtin/shapeAnimation'
import { shapeArrangementPlugin } from './builtin/shapeArrangement'
import { snappingPlugin } from './builtin/snappingPlugin'
import { spatialIndexPlugin } from './builtin/spatialIndex'
import { stylesPlugin } from './builtin/styles'
import { themesPlugin } from './builtin/themes'
import { userPreferencesPlugin } from './builtin/userPreferences'
import type { TLPlugin } from './plugin'

/**
 * Create the plugins that give the editor its standard behavior without a DOM or React: user
 * preferences and themes, the camera, event dispatch, input state and click detection, hit
 * testing, snapping, shape arrangement and animation, styles, content transfer, selection,
 * editing, scribbles, edge scrolling, overlays, collaborators, performance events and external
 * content.
 *
 * A headless editor usually starts from these and adds a text measurement plugin:
 *
 * @example
 * ```ts
 * const editor = createEditor({
 *   plugins: [...createCorePlugins(), approximateTextMeasurementPlugin(), myShapesPlugin],
 * })
 * ```
 *
 * @public
 */
export function createCorePlugins(): TLPlugin[] {
	return [
		userPreferencesPlugin,
		themesPlugin,
		cameraPlugin,
		inputsPlugin,
		clickDetectionPlugin,
		eventDispatchPlugin,
		spatialIndexPlugin,
		snappingPlugin,
		shapeArrangementPlugin,
		groupingPlugin,
		duplicationPlugin,
		deepLinksPlugin,
		shapeAnimationPlugin,
		stylesPlugin,
		contentTransferPlugin,
		selectionPlugin,
		editingPlugin,
		scribblesPlugin,
		edgeScrollPlugin,
		overlaysPlugin,
		collaboratorsPlugin,
		performancePlugin,
		externalContentPlugin,
	]
}
