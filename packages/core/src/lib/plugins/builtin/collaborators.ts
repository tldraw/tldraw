// This module is part of the headless core. It must not import React or touch the DOM.
import { CollaboratorsManager } from '../../editor/managers/CollaboratorsManager/CollaboratorsManager'
import { defineCapability, definePlugin } from '../plugin'

/** @public */
export const collaboratorsCapability = defineCapability<CollaboratorsManager>('collaborators')

/**
 * Reads the presence records of remote peers. `editor.collaborators` and `getCollaborators` use it.
 *
 * @public
 */
export const collaboratorsPlugin = definePlugin({
	id: 'collaborators',
	provides: [collaboratorsCapability],
	setup(ctx) {
		const manager = new CollaboratorsManager(ctx.editor)
		ctx.provide(collaboratorsCapability, manager)
	},
})
