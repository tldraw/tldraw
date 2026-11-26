// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { defineCapability, definePlugin } from '../plugin'
import { cameraCapability } from './camera'
import { clickDetectionCapability } from './clickDetection'
import { EventDispatcher } from './EventDispatcher'
import { inputsCapability } from './inputs'

/** @public */
export const eventDispatchCapability = defineCapability<EventDispatcher>('eventDispatch')

/**
 * Runs the pointer, keyboard, wheel and pinch events that `editor.dispatch` gets: input state,
 * clicks, panning and zooming, modifier keys and the state chart. Without it, the editor does not
 * respond to events.
 *
 * @public
 */
export const eventDispatchPlugin = definePlugin({
	id: 'eventDispatch',
	provides: [eventDispatchCapability],
	requires: [inputsCapability, clickDetectionCapability, cameraCapability],
	setup(ctx) {
		ctx.provide(
			eventDispatchCapability,
			new EventDispatcher(ctx.editor, ctx.get(clickDetectionCapability))
		)
	},
})
