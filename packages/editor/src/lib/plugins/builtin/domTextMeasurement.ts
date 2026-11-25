import { TextManager } from '../../editor/managers/TextManager/TextManager'
import { definePlugin } from '../plugin'
import { textMeasurementCapability } from './textMeasurement'

/**
 * Measures text with hidden DOM elements in the editor's container. This is the browser default.
 *
 * @public
 */
export const domTextMeasurementPlugin = definePlugin({
	id: 'domTextMeasurement',
	provides: [textMeasurementCapability],
	setup(ctx) {
		const textManager = new TextManager(ctx.editor)
		ctx.provide(textMeasurementCapability, textManager)
		ctx.onDispose(() => textManager.dispose())
	},
})
