import { ReactNode, useCallback, useInsertionEffect, useState } from 'react'
import { Editor, TldrawOptions, TLUiOverrides, Tldraw, useEditor, useValue } from 'tldraw'
import { RenderReaction } from '../ui/reaction'

/**
 * Draw-your-own reactions.
 *
 * A reaction's `emoji` field is a free-form string that the commenting layer only ever stores,
 * syncs, and hands back to a renderer — it never assumes the string is an emoji glyph. That makes
 * a custom reaction system exactly two pieces:
 *
 * 1. A **palette** — the thing that produces a token. {@link DrawingReactionPalette} below is a
 *    drop-in for the built-in `EmojiPicker`: same props (`emoji`, `selected`, `onSelect`,
 *    `renderReaction`), but instead of a grid of glyphs it offers a small locked-down tldraw
 *    canvas you draw in, and emits the drawing as the token.
 * 2. A **renderer** — the thing that draws a token. {@link renderDrawingReaction} is a drop-in for
 *    `RenderReaction`, and {@link DrawingReactionContent} is the same thing shaped for the
 *    `components.ReactionContent` commenting option.
 *
 * The token here is a `data:` image URL (SVG by default, PNG optionally), so a reaction pill is
 * just an `<img>`. Tokens that don't look like one fall through to the default rendering, so a
 * drawing palette and the stock emoji palette can coexist on the same comment.
 *
 * Nothing in this file is wired up yet — see the notes at the bottom for what wiring it takes.
 */

// ── Tokens ───────────────────────────────────────────────────────────────────────────────────

/** The image format a drawn reaction is exported as. @public */
export type DrawingReactionFormat = 'svg' | 'png'

/**
 * The `data:` URL prefixes a drawn reaction token may use. Rendering is gated on this list rather
 * than on a bare `data:` check: a token arrives over sync from another user, and this is what keeps
 * an `<img src>` pointed at an image and nothing else.
 */
const TOKEN_PREFIXES = ['data:image/svg+xml,', 'data:image/svg+xml;', 'data:image/png;base64,']

/**
 * Whether `token` is a drawn reaction (as opposed to a plain emoji glyph). Use it anywhere you need
 * to tell the two kinds apart — validation before a write, or picking a renderer.
 *
 * @public
 */
export function isDrawingReactionToken(token: string): boolean {
	return TOKEN_PREFIXES.some((prefix) => token.startsWith(prefix))
}

// ── Renderer ─────────────────────────────────────────────────────────────────────────────────

/**
 * Sized in `em` so a drawn reaction matches whatever font size its host sets — the pill in the
 * reaction row and the larger tile in the palette both come out right without either of them
 * knowing about this file.
 */
const drawingTokenImageStyle = {
	width: '1.15em',
	height: '1.15em',
	objectFit: 'contain',
	display: 'inline-block',
	verticalAlign: 'middle',
} as const

/**
 * Draws a reaction token: a drawn token renders as an image, anything else falls through to the
 * token string (the default behaviour, i.e. an emoji glyph drawn by the OS emoji font). Pass it as
 * `renderReaction` to `Reaction`, `Reactions`, `EmojiPicker`, or `ReactionPicker`.
 *
 * SVG tokens are rendered via `<img>`, never inlined — an `<img>`-hosted SVG can't run script or
 * reach out to the network, which matters because tokens arrive from other users over sync.
 *
 * @public
 */
export function renderDrawingReaction(token: string): ReactNode {
	if (!isDrawingReactionToken(token)) return token
	return <img src={token} alt="" draggable={false} style={drawingTokenImageStyle} />
}

/**
 * {@link renderDrawingReaction} as a component, for the `ReactionContent` slot of the commenting
 * options: `CommentTool.configure({ components: { ReactionContent: DrawingReactionContent } })`.
 *
 * @public @react
 */
export function DrawingReactionContent({ token }: { token: string }) {
	return <>{renderDrawingReaction(token)}</>
}

// ── Export ───────────────────────────────────────────────────────────────────────────────────

/** @public */
export interface DrawingReactionExportOptions {
	/**
	 * `'svg'` (default) keeps the drawing crisp at any size and usually makes a smaller token for a
	 * simple doodle. `'png'` gives a fixed-cost token whatever the drawing's complexity.
	 */
	format?: DrawingReactionFormat
	/** Longest side of the exported image in px. PNG only; SVG scales itself. Defaults to 96. */
	size?: number
	/**
	 * Reject a token longer than this many characters. A reaction is a synced record, so a token is
	 * paid for by every client on the file, forever — a scribble that won't fit is better refused at
	 * the palette than stored. Defaults to 32,000 characters (~32KB).
	 */
	maxTokenLength?: number
	/** Export in dark mode. Defaults to false, so a reaction looks the same for every viewer. */
	darkMode?: boolean
}

/** Thrown by {@link exportDrawingReactionToken} when the drawing doesn't fit in a token. @public */
export class DrawingReactionTooLargeError extends Error {
	constructor(
		readonly length: number,
		readonly maxLength: number
	) {
		super(`Drawing is too detailed to store as a reaction (${length}/${maxLength} characters).`)
		this.name = 'DrawingReactionTooLargeError'
	}
}

/**
 * Export everything on an editor's current page as a reaction token — a transparent `data:` image
 * URL, cropped to the ink with no canvas background.
 *
 * Returns null when there's nothing drawn. Throws {@link DrawingReactionTooLargeError} when the
 * result exceeds `maxTokenLength`.
 *
 * @public
 */
export async function exportDrawingReactionToken(
	editor: Editor,
	opts: DrawingReactionExportOptions = {}
): Promise<string | null> {
	const { format = 'svg', size = 96, maxTokenLength = 32_000, darkMode = false } = opts

	const ids = [...editor.getCurrentPageShapeIds()]
	if (ids.length === 0) return null

	// `padding: 'auto'` trims to the visual bounds of the ink — including stroke overflow — which is
	// what makes the result read as a glyph rather than as a screenshot of a canvas.
	const exportOpts = { background: false, padding: 'auto', darkMode } as const

	let token: string
	if (format === 'svg') {
		const result = await editor.getSvgString(ids, exportOpts)
		if (!result) return null
		// Percent-encoded rather than base64: it's smaller for markup, and stays greppable in the
		// store when you're debugging what a reaction actually holds.
		token = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`
	} else {
		// Scale so the drawing's longest side lands near `size`. The auto-trim above shifts this a
		// little; near enough, since the pill draws the image at a CSS size anyway.
		const bounds = editor.getCurrentPageBounds()
		const longest = bounds ? Math.max(bounds.width, bounds.height) : size
		const result = await editor.toImageDataUrl(ids, {
			...exportOpts,
			format: 'png',
			pixelRatio: 1,
			scale: longest > 0 ? size / longest : 1,
		})
		token = result.url
	}

	if (token.length > maxTokenLength) {
		throw new DrawingReactionTooLargeError(token.length, maxTokenLength)
	}
	return token
}

// ── Palette ──────────────────────────────────────────────────────────────────────────────────

/**
 * Keyboard shortcuts stay mounted when `hideUi` is set, so hiding the toolbar isn't enough on its
 * own: `v` would still put the canvas into select, `cmd+a` would still select all. Removing the
 * tools and actions from the UI context removes their shortcuts with them, which leaves the canvas
 * genuinely two-tool rather than two-tool-until-you-touch-the-keyboard.
 */
const DRAWING_EDITOR_OVERRIDES: TLUiOverrides = {
	tools: (_editor, tools) => ({ draw: tools.draw, eraser: tools.eraser }),
	actions: () => ({}),
}

/**
 * A locked camera makes the box a fixed sheet of paper: what you see is the whole drawing, so the
 * export can't come back cropped or surprise you with ink parked off-screen. The panning options go
 * with it — a locked camera already refuses their moves, but leaving them on means spacebar and
 * right-drag do nothing visible, which reads as broken.
 */
const DRAWING_EDITOR_OPTIONS: Partial<TldrawOptions> = {
	camera: { isLocked: true },
	spacebarPanning: false,
	rightClickPanning: false,
	maxPages: 1,
}

/** @public */
export interface DrawingReactionPaletteProps {
	/**
	 * Tokens to offer for one-click reuse, above the canvas — typically the reactions already on the
	 * comment, so a second person can add to a drawing rather than redraw it. Same slot as
	 * `EmojiPicker`'s `emoji` prop.
	 */
	emoji?: string[]
	/** Tokens the current user has already reacted with; shown pressed in the reuse row. */
	selected?: string[]
	/** Called with the new token when a drawing is exported, or with an existing token when reused. */
	onSelect?(token: string): void
	/** How to draw each token in the reuse row. Defaults to {@link renderDrawingReaction}. */
	renderReaction?: RenderReaction
	/**
	 * Side of the (square) drawing box: any CSS length. Defaults to a quarter of the viewport's
	 * short side, clamped so it stays usable on a phone and doesn't swallow a desktop.
	 */
	size?: number | string
	/** Export settings for the drawing. See {@link DrawingReactionExportOptions}. */
	exportOptions?: DrawingReactionExportOptions
	/** Passed to the nested `<Tldraw>`, which is a second editor and wants its own license. */
	licenseKey?: string
	/** Label on the button that commits the drawing. Defaults to "React". */
	submitLabel?: string
}

/**
 * A palette that lets you draw your own reaction: a small square tldraw canvas with a locked
 * camera, a pen, and an eraser — nothing else — plus a button that exports what's on it as a
 * reaction token.
 *
 * Prop-compatible with `EmojiPicker`, so it drops into the same slot; unlike `EmojiPicker` it
 * renders its own editor, so it doesn't need an editor context of its own and can be staged
 * standalone.
 *
 * @public @react
 */
export function DrawingReactionPalette({
	emoji,
	selected,
	onSelect,
	renderReaction = renderDrawingReaction,
	size = 'clamp(180px, 25vmin, 320px)',
	exportOptions,
	licenseKey,
	submitLabel = 'React',
}: DrawingReactionPaletteProps) {
	useDrawingReactionStyles()

	return (
		// The palette is portaled into the host editor's container, so a wheel event that escapes it
		// lands on the host canvas and zooms the document behind the menu. The nested editor's camera
		// is locked, so it has no reason to want the event either — it stops here.
		<div className="tlui-cmt-drawing-palette" onWheel={stopPropagation}>
			{emoji && emoji.length > 0 && (
				<div className="tlui-cmt-drawing-palette__reuse" role="group">
					{emoji.map((token) => {
						const active = selected?.includes(token) ?? false
						return (
							<button
								key={token}
								type="button"
								className={
									active
										? 'tlui-cmt-drawing-palette__reuse-item tlui-cmt-drawing-palette__reuse-item--active'
										: 'tlui-cmt-drawing-palette__reuse-item'
								}
								aria-label={isDrawingReactionToken(token) ? 'Drawn reaction' : token}
								aria-pressed={active}
								onClick={() => onSelect?.(token)}
							>
								{renderReaction(token)}
							</button>
						)
					})}
				</div>
			)}

			<div className="tlui-cmt-drawing-palette__canvas" style={{ width: size, height: size }}>
				<Tldraw
					hideUi
					initialState="draw"
					licenseKey={licenseKey}
					options={DRAWING_EDITOR_OPTIONS}
					overrides={DRAWING_EDITOR_OVERRIDES}
				>
					{/* Inside the editor rather than beside it: the toolbar reads the tool and the
					    emptiness straight off `useEditor()`, so there's no editor instance to lift out
					    into React state and nothing that leaves the buttons inert if the lift fails. */}
					<DrawingPaletteToolbar
						exportOptions={exportOptions}
						submitLabel={submitLabel}
						onSelect={onSelect}
					/>
				</Tldraw>
			</div>
		</div>
	)
}

interface DrawingPaletteToolbarProps {
	exportOptions: DrawingReactionExportOptions | undefined
	submitLabel: string
	onSelect: ((token: string) => void) | undefined
}

/** The bar over the bottom of the drawing box. Renders as a child of the palette's own editor. */
function DrawingPaletteToolbar({
	exportOptions,
	submitLabel,
	onSelect,
}: DrawingPaletteToolbarProps) {
	const editor = useEditor()
	const tool = useValue('drawing palette tool', () => editor.getCurrentToolId(), [editor])
	const isEmpty = useValue(
		'drawing palette is empty',
		() => editor.getCurrentPageShapeIds().size === 0,
		[editor]
	)
	const [isExporting, setIsExporting] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const clear = useCallback(() => {
		setError(null)
		editor.deleteShapes([...editor.getCurrentPageShapeIds()])
		editor.setCurrentTool('draw')
	}, [editor])

	const submit = useCallback(async () => {
		setError(null)
		setIsExporting(true)
		try {
			const token = await exportDrawingReactionToken(editor, exportOptions)
			if (token) onSelect?.(token)
		} catch (e) {
			setError(
				e instanceof DrawingReactionTooLargeError
					? 'That drawing is too detailed — try something simpler.'
					: "Couldn't export that drawing."
			)
		} finally {
			setIsExporting(false)
		}
	}, [editor, exportOptions, onSelect])

	return (
		<>
			{error && (
				<div className="tlui-cmt-drawing-palette__error" role="alert">
					{error}
				</div>
			)}
			<div className="tlui-cmt-drawing-palette__toolbar">
				<ToolButton
					label="Pen"
					active={tool === 'draw'}
					onClick={() => editor.setCurrentTool('draw')}
				>
					<PenIcon />
				</ToolButton>
				<ToolButton
					label="Eraser"
					active={tool === 'eraser'}
					onClick={() => editor.setCurrentTool('eraser')}
				>
					<EraserIcon />
				</ToolButton>
				<button
					type="button"
					className="tlui-cmt-drawing-palette__text-button"
					onClick={clear}
					disabled={isEmpty}
				>
					Clear
				</button>
				<div className="tlui-cmt-drawing-palette__spacer" />
				<button
					type="button"
					className="tlui-cmt-drawing-palette__submit"
					onClick={submit}
					disabled={isEmpty || isExporting}
				>
					{submitLabel}
				</button>
			</div>
		</>
	)
}

function ToolButton({
	label,
	active,
	onClick,
	children,
}: {
	label: string
	active: boolean
	onClick(): void
	children: ReactNode
}) {
	return (
		<button
			type="button"
			className={
				active
					? 'tlui-cmt-drawing-palette__tool tlui-cmt-drawing-palette__tool--active'
					: 'tlui-cmt-drawing-palette__tool'
			}
			aria-label={label}
			title={label}
			aria-pressed={active}
			onClick={onClick}
		>
			{children}
		</button>
	)
}

function stopPropagation(event: { stopPropagation(): void }) {
	event.stopPropagation()
}

function PenIcon() {
	return (
		<svg
			width="15"
			height="15"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.3"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M11.2 2.3a1.6 1.6 0 0 1 2.3 2.3L5.4 12.7l-3 .7.7-3z" />
			<path d="M10.1 3.4 12.4 5.7" />
		</svg>
	)
}

function EraserIcon() {
	return (
		<svg
			width="15"
			height="15"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="1.3"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M8.8 2.9 3 8.7a1.4 1.4 0 0 0 0 2l2 2a1.4 1.4 0 0 0 1 .4h2.4l4.4-4.4a1.4 1.4 0 0 0 0-2l-2-2a1.4 1.4 0 0 0-2 0z" />
			<path d="M5.9 5.8 10.9 10.8M6.4 13.1h6.7" />
		</svg>
	)
}

// ── Styles ───────────────────────────────────────────────────────────────────────────────────

const STYLE_ELEMENT_ID = 'tlui-cmt-drawing-palette-styles'

/**
 * The palette carries its own stylesheet rather than living in `comments.css`, so it stays a single
 * self-contained file while it's a prototype. Move these rules into `comments.css` if it graduates.
 */
const STYLES = `
.tlui-cmt-drawing-palette {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: 6px;
	color: var(--tl-color-text-1);
	font-size: 12px;
}
.tlui-cmt-drawing-palette__reuse {
	display: flex;
	flex-wrap: wrap;
	gap: 2px;
	padding-bottom: 2px;
	border-bottom: 1px solid var(--tl-color-divider);
}
.tlui-cmt-drawing-palette__reuse-item {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34px;
	height: 34px;
	border: none;
	border-radius: var(--tl-radius-2);
	background: none;
	color: inherit;
	font: inherit;
	font-size: 21px;
	line-height: 1;
	cursor: pointer;
}
.tlui-cmt-drawing-palette__reuse-item:hover {
	background: var(--tl-color-muted-2);
}
.tlui-cmt-drawing-palette__reuse-item--active {
	background: color-mix(in srgb, var(--tl-color-selected) 28%, var(--tl-color-panel));
}
.tlui-cmt-drawing-palette__canvas {
	position: relative;
	overflow: hidden;
	border: 1px solid var(--tl-color-divider);
	border-radius: var(--tl-radius-3);
}
/* Sits over the bottom of the drawing box. The z-index is what keeps it above the canvas — it's a
   sibling of the canvas inside the editor's container, not a panel the editor knows about. */
.tlui-cmt-drawing-palette__toolbar {
	position: absolute;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: var(--tl-layer-panels, 300);
	display: flex;
	align-items: center;
	gap: 2px;
	padding: 3px;
	border-top: 1px solid var(--tl-color-divider);
	background: var(--tl-color-panel);
}
.tlui-cmt-drawing-palette__spacer {
	flex: 1;
}
.tlui-cmt-drawing-palette__tool {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border: none;
	border-radius: var(--tl-radius-2);
	background: none;
	color: var(--tl-color-text-1);
	cursor: pointer;
}
.tlui-cmt-drawing-palette__tool:hover {
	background: var(--tl-color-muted-2);
}
.tlui-cmt-drawing-palette__tool--active {
	background: color-mix(in srgb, var(--tl-color-selected) 28%, var(--tl-color-panel));
}
.tlui-cmt-drawing-palette__text-button,
.tlui-cmt-drawing-palette__submit {
	height: 28px;
	padding: 0 10px;
	border: none;
	border-radius: var(--tl-radius-2);
	background: none;
	color: var(--tl-color-text-1);
	font: inherit;
	cursor: pointer;
}
.tlui-cmt-drawing-palette__text-button:hover:not(:disabled) {
	background: var(--tl-color-muted-2);
}
.tlui-cmt-drawing-palette__submit {
	background: var(--tl-color-selected);
	color: var(--tl-color-selected-contrast, #fff);
	font-weight: 500;
}
.tlui-cmt-drawing-palette__submit:hover:not(:disabled) {
	filter: brightness(1.08);
}
.tlui-cmt-drawing-palette__text-button:disabled,
.tlui-cmt-drawing-palette__submit:disabled {
	opacity: 0.4;
	cursor: default;
}
.tlui-cmt-drawing-palette__error {
	position: absolute;
	bottom: 34px;
	left: 0;
	right: 0;
	z-index: var(--tl-layer-panels, 300);
	padding: 4px 6px;
	background: var(--tl-color-panel);
	color: var(--tl-color-danger);
	text-align: center;
}
`

/**
 * Injects the palette's stylesheet once per document, keyed by id. Never removed — a second palette
 * mounting later would otherwise have to reinject it, and the rules are inert without the markup.
 */
function useDrawingReactionStyles() {
	// Insertion effect so the rules land before the palette paints, rather than a frame after it.
	useInsertionEffect(() => {
		if (typeof document === 'undefined') return
		if (document.getElementById(STYLE_ELEMENT_ID)) return
		const style = document.createElement('style')
		style.id = STYLE_ELEMENT_ID
		style.textContent = STYLES
		document.head.appendChild(style)
	}, [])
}

/**
 * ── Using it ─────────────────────────────────────────────────────────────────────────────────
 *
 * All three pieces are configured on the comment tool, and they have to agree: the palette emits
 * tokens, the renderer draws them, and the validation lets them through.
 *
 * ```tsx
 * <Tldraw
 *   tools={[
 *     CommentTool.configure({
 *       components: {
 *         ReactionPalette: DrawingReactionPalette,
 *         ReactionContent: DrawingReactionContent,
 *       },
 *       // keep emoji working too, so reactions posted before the swap still toggle
 *       isAllowedReaction: (token) =>
 *         isDrawingReactionToken(token) || isAllowedReactionEmoji(token),
 *     }),
 *   ]}
 * />
 * ```
 *
 * One thing still open: a drawn token is stored in full on the reaction record and replicated to
 * every client on the file. `maxTokenLength` caps it at the palette; the server-side reaction
 * validation wants a matching cap, or a small SVG becomes an upload channel.
 */
