import { atom, createShapeId, Editor, TLShapeId, TLShapePartial, toRichText } from 'tldraw'
import {
	GhostColor,
	GhostShape,
	hexOf,
	Proposal,
	reduceAction,
	Streaming,
	type AgentAction,
} from './actions'
import { UI_COMPONENT_TYPE } from './UIComponentShape'

// The staging layer. Proposals live in a plain local atom and are NEVER written
// to `editor.store` — so they don't sync, don't persist, and are invisible to
// other tabs. Accepting a proposal is the hand-off: it creates / updates /
// deletes a real document record, which DOES sync and persist. Rejecting simply
// drops the proposal.
export const proposals$ = atom<Proposal[]>('agent-ghost-proposals', [])

/** Fold a streamed agent action into the staging layer. */
export function applyActionToStage(action: Streaming<AgentAction>) {
	proposals$.update((proposals) => reduceAction(proposals, action))
}

export function clearProposals() {
	proposals$.set([])
}

export function rejectProposal(id: string) {
	proposals$.update((proposals) => proposals.filter((p) => p.id !== id))
}

export function rejectAll() {
	clearProposals()
}

/** Materialize a single proposal into the real document, then drop the ghost. */
export function acceptProposal(editor: Editor, id: string) {
	const proposal = proposals$.get().find((p) => p.id === id)
	if (!proposal) return
	editor.run(() => materialize(editor, proposal))
	rejectProposal(id)
}

/** Materialize every pending proposal in one batch. */
export function acceptAll(editor: Editor) {
	const all = proposals$.get()
	if (all.length === 0) return
	editor.run(() => {
		for (const proposal of all) materialize(editor, proposal)
	})
	clearProposals()
}

function materialize(editor: Editor, proposal: Proposal) {
	switch (proposal.kind) {
		case 'create': {
			editor.createShape(ghostToShapePartial(proposal.ghost))
			break
		}
		case 'update': {
			const partial = changesToShapePartial(editor, proposal.targetId, proposal.changes)
			if (partial) editor.updateShape(partial)
			break
		}
		case 'delete': {
			editor.deleteShapes([proposal.targetId])
			break
		}
	}
}

// ============================================================================
// Ghost -> real tldraw shape conversion
// ============================================================================
//
// The default prop shapes here mirror the agent kit's `SHAPE_DEFAULTS` in
// templates/agent/client/actions/CreateActionUtil.ts. `createShape` fills in any
// props we omit, so we only set what the ghost actually carries.

/** Convert a staged ghost into a real shape partial for `editor.createShape`. */
export function ghostToShapePartial(ghost: GhostShape): TLShapePartial {
	const id = createShapeId()
	const color = ghost.color ?? 'violet'

	switch (ghost.kind) {
		case 'ui':
			return {
				id,
				type: UI_COMPONENT_TYPE,
				x: ghost.x,
				y: ghost.y,
				props: {
					w: ghost.w ?? 240,
					h: ghost.h ?? 48,
					variant: ghost.variant ?? 'button',
					label: ghost.text ?? '',
					accent: hexOf(ghost.color),
				},
			}
		case 'rectangle':
		case 'ellipse':
			return {
				id,
				type: 'geo',
				x: ghost.x,
				y: ghost.y,
				props: {
					geo: ghost.kind,
					w: ghost.w ?? 160,
					h: ghost.h ?? 100,
					color,
					...(ghost.text ? { richText: toRichText(ghost.text) } : {}),
				},
			}
		case 'text':
			return {
				id,
				type: 'text',
				x: ghost.x,
				y: ghost.y,
				props: { color, richText: toRichText(ghost.text ?? '') },
			}
		case 'note':
			return {
				id,
				type: 'note',
				x: ghost.x,
				y: ghost.y,
				props: { color, richText: toRichText(ghost.text ?? '') },
			}
		case 'arrow': {
			const end = ghost.end ?? { x: ghost.x + 120, y: ghost.y }
			return {
				id,
				type: 'arrow',
				x: ghost.x,
				y: ghost.y,
				// Arrow start/end are relative to the shape's x/y.
				props: { color, start: { x: 0, y: 0 }, end: { x: end.x - ghost.x, y: end.y - ghost.y } },
			}
		}
	}
}

/** Build an update partial for an existing shape from a ghost change set. */
function changesToShapePartial(
	editor: Editor,
	targetId: TLShapeId,
	changes: Partial<GhostShape>
): TLShapePartial | null {
	const shape = editor.getShape(targetId)
	if (!shape) return null

	const isUI = shape.type === UI_COMPONENT_TYPE
	const props: Record<string, unknown> = {}
	if (changes.color) {
		// Built-in shapes take a color-name style; the custom shape takes a hex accent.
		if (isUI) props.accent = hexOf(changes.color)
		else props.color = changes.color as GhostColor
	}
	if (changes.text !== undefined) {
		if (isUI) props.label = changes.text
		else if ('richText' in (shape.props as object)) props.richText = toRichText(changes.text)
	}
	if (changes.w !== undefined && 'w' in (shape.props as object)) props.w = changes.w
	if (changes.h !== undefined && 'h' in (shape.props as object)) props.h = changes.h

	return {
		id: targetId,
		type: shape.type,
		...(changes.x !== undefined ? { x: changes.x } : {}),
		...(changes.y !== undefined ? { y: changes.y } : {}),
		...(Object.keys(props).length > 0 ? { props } : {}),
	} as TLShapePartial
}
