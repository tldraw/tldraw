// This module is part of the headless editor kernel. It must not import React or touch the DOM.
import { PerformanceManager } from '../../editor/managers/PerformanceManager/PerformanceManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const performanceCapability = defineCapability<PerformanceManager>('performance')

/**
 * Measures interactions and camera operations, and emits them as performance events. `editor.performance` uses it. Without it, the editor emits no performance events.
 *
 * @public
 */
export const performancePlugin = definePlugin({
	id: 'performance',
	provides: [performanceCapability],
	setup(ctx) {
		const manager = new PerformanceManager(ctx.editor)
		ctx.provide(performanceCapability, manager)
		ctx.onDispose(() => manager.dispose())
	},
})
