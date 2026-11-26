// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { InputsManager } from '../../editor/managers/InputsManager/InputsManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const inputsCapability = defineCapability<InputsManager>('inputs')

/**
 * Tracks pointer, keyboard and modifier state from the events that the editor dispatches. `editor.inputs` uses it.
 *
 * @public
 */
export const inputsPlugin = definePlugin({
	id: 'inputs',
	provides: [inputsCapability],
	setup(ctx) {
		const manager = new InputsManager(ctx.editor)
		ctx.provide(inputsCapability, manager)
		ctx.onDispose(() => manager.dispose())
	},
})
