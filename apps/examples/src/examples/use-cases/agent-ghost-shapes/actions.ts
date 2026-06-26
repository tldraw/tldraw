import { TLShapeId } from 'tldraw'
import type { UIVariant } from './UIComponentShape'

// The vocabulary and streaming model here are borrowed from the tldraw agent
// starter kit (templates/agent). The agent emits a stream of structured
// *actions*; each action is applied through a small registry of "action utils".
// The difference in this example: instead of applying actions to the editor's
// document store, we apply them to a local *staging* layer (see proposals.ts),
// so a proposed change is a ghost until the user accepts it.

/**
 * A streamed object that may not be complete yet. Mirrors the agent kit's
 * `Streaming<T>`: while streaming, you get a partial with `complete: false`;
 * once finished, the full object with `complete: true`.
 */
export type Streaming<T> = (Partial<T> & { complete: false }) | (T & { complete: true })

// `ui` proposes a custom UI-component shape (see UIComponentShape.tsx); the rest
// map to tldraw's built-in shapes. The example handles both as ghosts.
export type GhostKind = 'ui' | 'rectangle' | 'ellipse' | 'text' | 'note' | 'arrow'

/** A tldraw color name. A small, friendly subset of the full palette. */
export type GhostColor = 'black' | 'blue' | 'green' | 'orange' | 'red' | 'violet' | 'yellow'

/** Hex equivalents, used for the ghost preview and the custom shape's accent. */
export const GHOST_HEX: Record<GhostColor, string> = {
	black: '#1d1d1d',
	blue: '#4263eb',
	green: '#099268',
	orange: '#e8590c',
	red: '#e03131',
	violet: '#8b5cf6',
	yellow: '#f08c00',
}

export function hexOf(color?: GhostColor): string {
	return GHOST_HEX[color ?? 'violet']
}

/**
 * A normalized, store-independent description of a shape the agent wants to
 * create. All geometry is in *page* coordinates so it can be rendered directly
 * in the `OnTheCanvas` layer and converted to a real shape on accept.
 */
export interface GhostShape {
	/** Staging id (a plain string). Becomes a real shape id when accepted. */
	id: string
	kind: GhostKind
	/** Top-left for box-like shapes; the start point for arrows and draws. */
	x: number
	y: number
	/** Box size (rectangle, ellipse, text, note). */
	w?: number
	h?: number
	/** Label / body text (text, note, and as a label on geo shapes). */
	text?: string
	color?: GhostColor
	/** Which UI component to render (only for kind `ui`). */
	variant?: UIVariant
	/** Arrow end point, in page coordinates. */
	end?: { x: number; y: number }
}

/**
 * An action streamed from the agent. `update` and `delete` target a *real*
 * shape already on the canvas (by its `TLShapeId`); `create` introduces a new
 * ghost. `think` is narration and produces no proposal.
 */
export type AgentAction =
	| { _type: 'create'; shape: GhostShape; intent?: string }
	| { _type: 'update'; shapeId: TLShapeId; changes: Partial<GhostShape>; intent?: string }
	| { _type: 'delete'; shapeId: TLShapeId; intent?: string }
	| { _type: 'think'; text: string }

export type AgentActionType = AgentAction['_type']

/**
 * A staged proposal: the agent's intent held outside the document store. Accept
 * materializes it into a real shape; reject drops it and nothing was ever
 * written to the store.
 */
export type Proposal =
	| { id: string; kind: 'create'; ghost: GhostShape; intent: string }
	| {
			id: string
			kind: 'update'
			targetId: TLShapeId
			changes: Partial<GhostShape>
			intent: string
	  }
	| { id: string; kind: 'delete'; targetId: TLShapeId; intent: string }

/**
 * The action registry, mirroring the agent kit's `AgentActionUtil`: each action
 * type knows how to (a) describe itself for the chat/status line and (b) fold
 * itself into the staging layer. `reduce` is a pure transform over the current
 * proposals, which makes streaming upserts easy to reason about.
 */
interface ActionUtil<T extends AgentAction = AgentAction> {
	describe(action: Streaming<T>): string
	/** Returns the next proposals list. `think` returns it unchanged. */
	reduce(proposals: Proposal[], action: Streaming<T>): Proposal[]
}

function upsert(proposals: Proposal[], next: Proposal): Proposal[] {
	const index = proposals.findIndex((p) => p.id === next.id)
	if (index === -1) return [...proposals, next]
	const copy = [...proposals]
	copy[index] = next
	return copy
}

export const ACTION_UTILS: {
	[K in AgentActionType]: ActionUtil<Extract<AgentAction, { _type: K }>>
} = {
	create: {
		describe: (a) => a.intent ?? (a.shape ? `Add ${a.shape.kind}` : 'Add a shape'),
		reduce: (proposals, a) => {
			// Need at least a kind and an id before we can stage anything.
			if (!a.shape || !a.shape.id || !a.shape.kind) return proposals
			return upsert(proposals, {
				id: a.shape.id,
				kind: 'create',
				ghost: a.shape as GhostShape,
				intent: a.intent ?? `Add ${a.shape.kind}`,
			})
		},
	},
	update: {
		describe: (a) => a.intent ?? 'Update a shape',
		reduce: (proposals, a) => {
			if (!a.shapeId) return proposals
			return upsert(proposals, {
				id: `update:${a.shapeId}`,
				kind: 'update',
				targetId: a.shapeId,
				changes: a.changes ?? {},
				intent: a.intent ?? 'Update a shape',
			})
		},
	},
	delete: {
		describe: (a) => a.intent ?? 'Delete a shape',
		reduce: (proposals, a) => {
			if (!a.shapeId) return proposals
			return upsert(proposals, {
				id: `delete:${a.shapeId}`,
				kind: 'delete',
				targetId: a.shapeId,
				intent: a.intent ?? 'Delete a shape',
			})
		},
	},
	think: {
		describe: (a) => a.text ?? '',
		reduce: (proposals) => proposals,
	},
}

/** Describe any action for the status line / chat strip. */
export function describeAction(action: Streaming<AgentAction>): string {
	if (!action._type) return ''
	const util = ACTION_UTILS[action._type] as ActionUtil
	return util.describe(action)
}

/** Fold a streamed action into the proposals list (pure). */
export function reduceAction(proposals: Proposal[], action: Streaming<AgentAction>): Proposal[] {
	if (!action._type) return proposals
	const util = ACTION_UTILS[action._type] as ActionUtil
	return util.reduce(proposals, action)
}
