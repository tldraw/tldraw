// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { clickDetectionPlugin } from './builtin/clickDetection'
import { collaboratorsPlugin } from './builtin/collaborators'
import { edgeScrollPlugin } from './builtin/edgeScroll'
import { externalContentPlugin } from './builtin/externalContent'
import { inputsPlugin } from './builtin/inputs'
import { overlaysPlugin } from './builtin/overlays'
import { performancePlugin } from './builtin/performance'
import { scribblesPlugin } from './builtin/scribbles'
import { snappingPlugin } from './builtin/snappingPlugin'
import { spatialIndexPlugin } from './builtin/spatialIndex'
import { themesPlugin } from './builtin/themes'
import { userPreferencesPlugin } from './builtin/userPreferences'
import type { TLPlugin } from './plugin'

/**
 * Create the plugins that give the editor its standard behavior without a DOM or React: user
 * preferences and themes, input state and click detection, hit testing, snapping, scribbles,
 * edge scrolling, overlays, collaborators, performance events and external content.
 *
 * A headless editor usually starts from these and adds a text measurement plugin:
 *
 * @example
 * ```ts
 * const editor = createEditor({
 *   plugins: [...createKernelPlugins(), approximateTextMeasurementPlugin(), myShapesPlugin],
 * })
 * ```
 *
 * @public
 */
export function createKernelPlugins(): TLPlugin[] {
	return [
		userPreferencesPlugin,
		themesPlugin,
		inputsPlugin,
		clickDetectionPlugin,
		spatialIndexPlugin,
		snappingPlugin,
		scribblesPlugin,
		edgeScrollPlugin,
		overlaysPlugin,
		collaboratorsPlugin,
		performancePlugin,
		externalContentPlugin,
	]
}
