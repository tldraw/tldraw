import { AGENT_ACTION_TYPES } from '../schema/FairySchema'
import { AgentAction } from './AgentAction'

export interface Wand {
	type: string
	name: string
	description: string
	availableActions: AgentAction['_type'][]
}

/**
 * Wand definitions determine what wands are available to the agent.
 */
export const WAND_DEFINITIONS = [
	{
		type: 'god',
		name: 'Almighty Wand',
		description: 'A wand that allows the agent to perform any action. Use with caution.',
		availableActions: AGENT_ACTION_TYPES,
	},
	{
		type: 'pen',
		name: 'Pen Wand',
		description: 'A wand well-suited for drawing pictures with the pen.',
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'note-to-self',
			'pen',
			'delete',
			'update',
			'move',
			'bring-to-front',
			'send-to-back',
			'rotate',
			'resize',
		],
	},
	{
		type: 'destroy',
		name: 'The Destroyer',
		description: 'A wand for deleting only.',
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'note-to-self',
			'delete',
		],
	},
	{
		type: 'mouth',
		name: 'Mouth Wand',
		description:
			"A wand with a mouth on the end. With this wand, your fairy will speak with you, but won't be able to edit the canvas.",
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'note-to-self',
		],
	},
	{
		type: 'diagram',
		name: 'Diagram Wand',
		description: 'A wand well-suited for creating diagrams.',
		availableActions: [
			'message',
			'think',
			'review',
			'update-todo-list',
			'fly-to-bounds',
			'note-to-self',
		],
	},
] as const satisfies Wand[]
