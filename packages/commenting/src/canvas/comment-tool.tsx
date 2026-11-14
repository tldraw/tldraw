import {
	BoxModel,
	Editor,
	StateNode,
	TLCommentAnchor,
	TLStateNodeConstructor,
	TLUiOverrides,
	VecLike,
	defineMessages,
} from 'tldraw'
import { type CommentingOptions, defaultCommentingOptions, getCommentingOptions } from './options'
import { commentsSidebarOpen, pendingComment, regionDraft } from './state'
import { commentTargetShapeAt, regionPinPoint, shapeAnchorAt } from './thread-state'

/** A comment being placed but not yet posted: where its composer sits and what it will anchor
 *  to. Shared between the tool (which sets it on click) and the overlay (which renders the
 *  composer) through the internal `pendingComment` atom.
 * @internal */
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
 * The comment tool. Pressing down opens the comment composer at the pointer and it follows until
 * release — like placing a sticky note — settling on a point, or on a shape when released over one.
 * With region comments enabled, dragging past the threshold draws a region rectangle instead.
 * Placement only opens a composer; the records are created when the comment is posted. Releasing
 * hands back to the select tool (unless the tool is locked) with the composer still open — it stays until the comment is
 * posted, or dismissed by Escape or a press outside it.
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
		// Drop the hover hint painted while pointing at shapes (see CommentIdle) and any unfinished
		// region draft. The cursor resets when the next tool takes over. A placed composer outlives
		// the tool: placing hands straight back to select with it open.
		this.editor.setHintingShapes([])
		regionDraft.set(this.editor, null)
	}

	// Escape leaves the tool, like the built-in tools (the editor dispatches `cancel` on Escape).
	// Mid-placement it also drops the composer that's following the pointer: this handler runs
	// before the child state's, and leaving the tool skips the child's own cancel.
	override onCancel() {
		if (this.getCurrent()?.id !== 'idle') pendingComment.set(this.editor, null)
		this.editor.setCurrentTool('select')
	}
}

/** The pending placement a release at `point` resolves to: anchored to the shape under it, or a
 *  bare point. Shared by the tool's click placement and the composer's drag handle. */
export function pendingCommentAt(
	editor: Editor,
	point: VecLike,
	altKey = editor.inputs.getAltKey()
): PendingComment {
	const hit = commentTargetShapeAt(editor, point)
	const anchor: TLCommentAnchor = hit
		? shapeAnchorAt(
				editor,
				hit.id,
				point,
				getCommentingOptions(editor).shouldBePrecise(editor, {
					shapeId: hit.id,
					point,
					altKey,
				})
			)
		: { type: 'point', x: point.x, y: point.y }
	return { anchor, point: { x: point.x, y: point.y } }
}

/**
 * Open the comment composer at a page point, anchored as a comment tool click there would be. Use
 * it to start a comment from outside the tool, such as a context menu item. Like a placement with the
 * tool, it leaves the select tool active with the composer open. It doesn't check `canComment`: a
 * viewer who can't comment sees the `ComposerFallback` slot instead.
 *
 * @example
 * ```tsx
 * <TldrawUiMenuItem id="comment" label="Comment" onSelect={() => startCommentAt(editor, point)} />
 * ```
 * @public
 */
export function startCommentAt(editor: Editor, point: VecLike) {
	editor.setCurrentTool('select')
	pendingComment.set(editor, pendingCommentAt(editor, point))
}

/** End a placement: the composer stays open at `pending` and, like the shape tools, the select
 *  tool takes over unless the tool is locked. */
function finishPlacement(state: StateNode, pending: PendingComment) {
	const { editor } = state
	pendingComment.set(editor, pending)
	if (editor.getInstanceState().isToolLocked) state.parent.transition('idle')
	else editor.setCurrentTool('select')
}

/** Hint the shape a comment placed at the pointer would anchor to, using the same hit-test as the
 *  anchor resolution on release. Hinting shapes render an indicator ungated by the active tool, so
 *  this shows the select-style outline while the comment tool — not select — is active. */
function updateAnchorHint(editor: Editor) {
	const hit = commentTargetShapeAt(editor, editor.inputs.getCurrentPagePoint())
	editor.setHintingShapes(hit ? [hit.id] : [])
}

class CommentIdle extends StateNode {
	static override id = 'idle'

	override onEnter() {
		// Back to hovering: restore the pin cursor (a cancelled placement may have changed it).
		this.editor.setCursor({ type: 'comment', rotation: 0 })
		updateAnchorHint(this.editor)
	}

	override onPointerMove() {
		updateAnchorHint(this.editor)
	}

	override onPointerDown() {
		this.parent.transition('pointing')
	}
}

class CommentPointing extends StateNode {
	static override id = 'pointing'

	override onEnter() {
		// Open the composer immediately at the press point so it's visible from pointer-down (not just
		// on release), and let it trail the pointer while dragging — like placing a sticky note. The
		// anchor is a bare point for now; it's resolved (shape or point) on pointer up.
		const { editor } = this
		// The composer opens under the pointer, so the pin cursor gives way to the plain pointer
		// right away; it becomes `move` once a drag starts.
		editor.setCursor({ type: 'default', rotation: 0 })
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
		if (getCommentingOptions(editor).enableRegions && editor.inputs.getIsDragging()) {
			this.parent.transition('dragging')
			return
		}
		// Otherwise the composer trails the pointer — keep hinting the shape a release here would
		// anchor to, like the idle hover does.
		if (editor.inputs.getIsDragging() && editor.getInstanceState().cursor.type !== 'move') {
			editor.setCursor({ type: 'move', rotation: 0 })
		}
		updateAnchorHint(editor)
		const point = editor.inputs.getCurrentPagePoint()
		pendingComment.update(editor, (p) => (p ? { ...p, point: { x: point.x, y: point.y } } : p))
	}

	// Settle where the pointer is released: anchor to the shape under it, or drop a point.
	override onPointerUp() {
		const { editor } = this
		const point = editor.inputs.getCurrentPagePoint()
		finishPlacement(this, pendingCommentAt(editor, point))
	}

	override onCancel() {
		this.cancel()
	}

	override onInterrupt() {
		this.cancel()
	}

	// Abandon the follow composer if placement is interrupted (Escape, focus loss, etc.). Its text
	// survives in the draft store.
	private cancel() {
		pendingComment.set(this.editor, null)
		this.editor.setCurrentTool('select')
	}
}

class CommentDragging extends StateNode {
	static override id = 'dragging'

	override onEnter() {
		// A region drag supersedes the point-follow composer opened in `pointing`. Show a crosshair again,
		// since the composer no longer stands in for the pointer, and drop the placement hint — a region
		// anchors to its rectangle, so a single-shape outline would be stale.
		pendingComment.set(this.editor, null)
		this.editor.setHintingShapes([])
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
		finishPlacement(this, {
			anchor: { type: 'region', ...region, pinX: pin.x, pinY: pin.y },
			point: regionPinPoint(region, pin),
		})
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

	// The tool's onExit drops the region draft.
	private cancel() {
		this.editor.setCurrentTool('select')
	}
}

/** @public */
export const commentTools = [CommentTool]

const messages = defineMessages({
	toolComment: { id: 'tool.comment', defaultMessage: 'Comment' },
})

/** Registers the comment tool in the UI (icon, label, shortcut). Compose into your overrides.
 *  Once registered, tldraw's `DefaultQuickActionsContent` shows the comment button, and its
 *  `DefaultContextMenuContent` shows a comment item that opens the composer where the menu was
 *  opened.
 * @public */
export const commentToolOverrides: TLUiOverrides = {
	tools(editor, tools) {
		tools.comment = {
			id: 'comment',
			icon: 'comment',
			label: messages.toolComment.id,
			kbd: 'c',
			onSelect: (source) => {
				// The menu was opened by the last pointer down; the live pointer is over the menu now.
				if (source === 'context-menu') startCommentAt(editor, editor.inputs.getOriginPagePoint())
				else editor.setCurrentTool('comment')
			},
		}
		return tools
	},
}
