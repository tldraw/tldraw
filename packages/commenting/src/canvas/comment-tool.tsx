import {
	BoxModel,
	StateNode,
	TLCommentAnchor,
	TLStateNodeConstructor,
	TLUiOverrides,
	VecLike,
} from 'tldraw'
import { type CommentingOptions, defaultCommentingOptions } from './options'
import { getRegionCommentOptions } from './region-options'
import { commentsSidebarOpen, pendingComment, regionDraft } from './state'
import { regionPinPoint, shapeAnchorAt } from './thread-state'

/** A comment being placed but not yet posted: where its composer sits and what it will anchor
 *  to. Shared between the tool (which sets it on click) and the overlay (which renders the
 *  composer). Null when nothing is being placed. The atom itself lives in `./state`
 *  ({@link pendingComment}), scoped per editor.
 * @public */
export interface PendingComment {
	anchor: TLCommentAnchor
	/** Page point where the composer opens (the click location, or a region's pin corner). */
	point: VecLike
}

/**
 * Merge configure options over a base. Shallow for scalars; `components` is merged rather than
 * replaced so chained `configure` calls layer their slots — a later `{ components: { PinContent } }`
 * doesn't drop an earlier `{ components: { CommentBody } }`.
 */
function mergeCommentingOptions(
	base: CommentingOptions,
	overrides: Partial<CommentingOptions>
): CommentingOptions {
	return {
		...base,
		...overrides,
		components: { ...base.components, ...overrides.components },
	}
}

/** The page-space rectangle spanned by two points, normalized so w/h are non-negative. Shared by
 *  region creation (pointer-down → cursor) and corner resize (fixed corner → cursor). */
export function regionBetween(a: VecLike, b: VecLike): BoxModel {
	return {
		x: Math.min(a.x, b.x),
		y: Math.min(a.y, b.y),
		w: Math.abs(a.x - b.x),
		h: Math.abs(a.y - b.y),
	}
}

/**
 * The comment tool. Pressing down opens the comment composer immediately at the pointer, and it
 * follows the pointer until release — like placing a sticky note — settling on a point, or on a
 * shape when released over one. (With region comments enabled, dragging past the threshold instead
 * draws a region rectangle.) Placement only opens a composer (via `pendingComment`); the records
 * are created when the comment is posted.
 * @public
 */
export class CommentTool extends StateNode {
	static override id = 'comment'
	static override initial = 'idle'
	static override children(): TLStateNodeConstructor[] {
		return [CommentIdle, CommentPointing, CommentDragging]
	}

	/**
	 * Configure this tool's {@link CommentTool.options | `options`}, returning a configured subclass
	 * to register via `tools`. Mirrors `ShapeUtil.configure`. Layers over any prior `configure`, so
	 * calls can be chained.
	 *
	 * @example
	 * ```tsx
	 * <Tldraw tools={[CommentTool.configure({ history: 'ignore', enableClustering: false })]} />
	 * ```
	 */
	static configure<T extends TLStateNodeConstructor>(
		this: T,
		options: T extends new (...args: any[]) => { options: infer Options } ? Partial<Options> : never
	): T {
		// @ts-expect-error -- mirrors ShapeUtil.configure; extending `this` is sound at runtime.
		return class extends this {
			// @ts-expect-error
			options = mergeCommentingOptions(this.options, options)
		}
	}

	/**
	 * The merged commenting options for this editor. Read from anywhere via
	 * {@link getCommentingOptions}. Override with {@link CommentTool.configure}.
	 */
	options: CommentingOptions = defaultCommentingOptions

	override onEnter() {
		this.editor.setCursor({ type: 'comment', rotation: 0 })
		// Placing comments is canvas-focused — the thread list gets out of the way while the tool is
		// active. Reopened via its own control (a button), never by leaving the tool.
		commentsSidebarOpen.set(this.editor, false)
	}

	override onExit() {
		// Drop the hover hint painted while pointing at shapes (see CommentIdle). The cursor resets
		// when the next tool takes over.
		this.editor.setHintingShapes([])
	}

	// Escape leaves the tool, like the built-in tools (the editor dispatches `cancel` on Escape).
	override onCancel() {
		this.editor.setCurrentTool('select')
	}
}

class CommentIdle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		// Back to hovering: restore the pin cursor (a prior placing state may have hidden it).
		this.editor.setCursor({ type: 'comment', rotation: 0 })
		this.updateHint()
	}

	// Hint the shape a click would attach to, using the same hit-test as onPointerUp below. Hinting
	// shapes render an indicator ungated by the active tool, so this shows the select-style outline
	// while the comment tool — not select — is active.
	override onPointerMove() {
		this.updateHint()
	}

	override onPointerDown() {
		this.parent.transition('pointing')
	}

	private updateHint() {
		const { editor } = this
		const hit = editor.getShapeAtPoint(editor.inputs.getCurrentPagePoint(), { hitInside: true })
		editor.setHintingShapes(hit ? [hit.id] : [])
	}
}

class CommentPointing extends StateNode {
	static override id = 'pointing'

	override onEnter() {
		// Open the composer immediately at the press point so it's visible from pointer-down (not just
		// on release), and let it trail the pointer while dragging — like placing a sticky note. The
		// anchor is a bare point for now; it's resolved (shape or point) on pointer up. Drop the idle
		// hover hint so a region drag doesn't leave a stale single-shape outline under the dashed box.
		const { editor } = this
		editor.setHintingShapes([])
		// Hide the cursor while placing: the draft composer is the pointer's stand-in now, so the pin
		// cursor sitting over it just reads as clutter.
		editor.setCursor({ type: 'none', rotation: 0 })
		const point = editor.inputs.getCurrentPagePoint()
		pendingComment.set(editor, {
			anchor: { type: 'point', x: point.x, y: point.y },
			point: { x: point.x, y: point.y },
		})
	}

	override onPointerMove() {
		const { editor } = this
		// Once the pointer passes the drag threshold with region comments enabled, this is a region,
		// not a follow — hand off to the region drag (which clears this composer and draws the box).
		if (getRegionCommentOptions(editor).enabled && editor.inputs.getIsDragging()) {
			this.parent.transition('dragging')
			return
		}
		// Otherwise the composer trails the pointer.
		const point = editor.inputs.getCurrentPagePoint()
		pendingComment.update(editor, (p) => (p ? { ...p, point: { x: point.x, y: point.y } } : p))
	}

	// Settle where the pointer is released: anchor to the shape under it, or drop a point.
	override onPointerUp() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		const hit = editor.getShapeAtPoint(point, { hitInside: true })
		const anchor: TLCommentAnchor = hit
			? shapeAnchorAt(editor, hit.id, point, editor.inputs.getAltKey())
			: { type: 'point', x: point.x, y: point.y }
		pendingComment.set(editor, { anchor, point: { x: point.x, y: point.y } })
		// Hand back to select; the open composer is now the focus.
		editor.setCurrentTool('select')
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	// Abandon the follow composer if placement is interrupted (Escape, focus loss, etc.).
	private cancel() {
		pendingComment.set(this.editor, null)
		this.editor.setCurrentTool('select')
	}
}

class CommentDragging extends StateNode {
	static override id = 'dragging'

	override onEnter() {
		// A region drag supersedes the point-follow composer opened in `pointing`. Show a crosshair
		// again — the composer no longer stands in for the pointer, so a hidden cursor would leave
		// the drag with no pointer at all.
		pendingComment.set(this.editor, null)
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.updateDraft()
	}

	override onPointerMove() {
		this.updateDraft()
	}

	// Commit the dragged rectangle as a region anchor; the composer opens at its pin corner.
	override onPointerUp() {
		const { editor } = this
		const origin = editor.inputs.getOriginPagePoint()
		const current = editor.inputs.getCurrentPagePoint()
		const region = regionBetween(origin, current)
		// The pin lives on the corner the drag released on — drag up-left, pin top-left.
		const pin = { x: current.x >= origin.x ? 1 : 0, y: current.y >= origin.y ? 1 : 0 }
		regionDraft.set(editor, null)
		pendingComment.set(editor, {
			anchor: { type: 'region', ...region, pinX: pin.x, pinY: pin.y },
			point: regionPinPoint(region, pin),
		})
		editor.setCurrentTool('select')
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	private updateDraft() {
		const { editor } = this
		regionDraft.set(
			editor,
			regionBetween(editor.inputs.getOriginPagePoint(), editor.inputs.getCurrentPagePoint())
		)
	}

	private cancel() {
		regionDraft.set(this.editor, null)
		this.editor.setCurrentTool('select')
	}
}

/** @public */
export const commentTools = [CommentTool]

/** Registers the comment tool in the UI (icon, label, shortcut). Compose into your overrides.
 *  Once registered, tldraw's `DefaultToolbarContent` shows the comment button next to the eraser.
 * @public */
export const commentToolOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.comment = {
			id: 'comment',
			icon: 'comment',
			label: 'Comment',
			kbd: 'c',
			onSelect: () => editor.setCurrentTool('comment'),
		}
		return tools
	},
}
