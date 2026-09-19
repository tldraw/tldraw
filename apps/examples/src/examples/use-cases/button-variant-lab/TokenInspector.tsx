import { useState } from 'react'
import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	SharedStyleMap,
	TLUiStylePanelProps,
	useEditor,
	useRelevantStyles,
	useValue,
} from 'tldraw'
import { ButtonFrameShape } from './ButtonFrameShapeUtil'
import {
	buttonTheme,
	resetButtonCss,
	resetVariantToken,
	setButtonCss,
	setVariantToken,
} from './buttonTheme'
import {
	BUTTON_TOKENS,
	BUTTON_VARIANTS,
	BUTTON_VARIANT_IDS,
	ButtonTokenId,
	ButtonVariant,
	DEFAULT_BUTTON_CSS,
} from './buttonTokens'

// There's a guide at the bottom of this file!

type EditScope = 'selected' | 'variant' | 'all'

const HEX_RE = /^#[0-9a-fA-F]{6}$/

const EMPTY_STYLES = new SharedStyleMap()

function formatList(items: string[]) {
	if (items.length <= 1) return items[0] ?? ''
	return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

export function TokenInspector(props: TLUiStylePanelProps) {
	const editor = useEditor()
	const [scope, setScope] = useState<EditScope>('selected')
	const [isSourceOpen, setIsSourceOpen] = useState(false)
	const theme = useValue(buttonTheme)

	const relevantStyles = useRelevantStyles()
	const styles = props.styles === undefined ? relevantStyles : props.styles

	const selectedFrames = useValue(
		'selected button frames',
		() =>
			editor.getSelectedShapes().filter((s): s is ButtonFrameShape => s.type === 'button-frame'),
		[editor]
	)
	const hasOtherSelection = useValue(
		'has other selection',
		() => editor.getSelectedShapes().some((s) => s.type !== 'button-frame'),
		[editor]
	)
	const isInSelectTool = useValue('is in select tool', () => editor.isIn('select'), [editor])

	const frameCount = selectedFrames.length

	// [1]
	const showTokens = frameCount > 0 || !hasOtherSelection
	const showDefaultContent = hasOtherSelection || (!isInSelectTool && styles !== null)

	// [2]
	const effectiveScope: EditScope = frameCount === 0 ? 'all' : scope
	const variantsInScope: ButtonVariant[] =
		effectiveScope === 'all'
			? [...BUTTON_VARIANT_IDS]
			: [...new Set(selectedFrames.map((f) => f.props.variant))]

	// [3]
	function getRowState(tokenId: ButtonTokenId): { value: string | null; modified: boolean } {
		if (effectiveScope === 'selected') {
			const values = selectedFrames.map(
				(f) => f.props.overrides[tokenId] ?? theme.variants[f.props.variant][tokenId]
			)
			return {
				value: values.every((v) => v === values[0]) ? values[0] : null,
				modified: selectedFrames.some((f) => tokenId in f.props.overrides),
			}
		}
		const values = variantsInScope.map((v) => theme.variants[v][tokenId])
		return {
			value: values.every((v) => v === values[0]) ? values[0] : null,
			modified: variantsInScope.some(
				(v) => theme.variants[v][tokenId] !== BUTTON_VARIANTS[v][tokenId]
			),
		}
	}

	// [4]
	function markEditSession() {
		if (effectiveScope === 'selected') {
			editor.markHistoryStoppingPoint('button token edit')
		}
	}

	function applyToken(tokenId: ButtonTokenId, next: string) {
		if (effectiveScope === 'selected') {
			editor.updateShapes(
				selectedFrames.map((shape) => ({
					id: shape.id,
					type: shape.type,
					props: { overrides: { ...shape.props.overrides, [tokenId]: next } },
				}))
			)
		} else {
			for (const variant of variantsInScope) {
				setVariantToken(variant, tokenId, next)
			}
		}
	}

	function resetToken(tokenId: ButtonTokenId) {
		if (effectiveScope === 'selected') {
			editor.markHistoryStoppingPoint('reset button token')
			editor.updateShapes(
				selectedFrames.map((shape) => {
					const { [tokenId]: _, ...rest } = shape.props.overrides
					return { id: shape.id, type: shape.type, props: { overrides: rest } }
				})
			)
		} else {
			for (const variant of variantsInScope) {
				resetVariantToken(variant, tokenId)
			}
		}
	}

	const context =
		frameCount === 0
			? 'Nothing selected — editing all variants'
			: effectiveScope === 'selected'
				? `Overrides on ${frameCount} selected frame${frameCount === 1 ? '' : 's'}`
				: effectiveScope === 'variant'
					? `Base tokens for ${formatList(variantsInScope)} frames`
					: 'Base tokens for all four variants'

	return (
		// [5]
		<DefaultStylePanel {...props} styles={showTokens ? (styles ?? EMPTY_STYLES) : styles}>
			{showTokens && (
				<div className="token-inspector">
					<div className="token-inspector__header">
						<div className="token-inspector__title">Button tokens</div>
						<div className="token-inspector__scopes">
							<button
								className="token-inspector__scope"
								data-active={effectiveScope === 'selected'}
								aria-pressed={effectiveScope === 'selected'}
								disabled={frameCount === 0}
								onClick={() => setScope('selected')}
							>
								Selected
							</button>
							<button
								className="token-inspector__scope"
								data-active={effectiveScope === 'variant'}
								aria-pressed={effectiveScope === 'variant'}
								disabled={frameCount === 0}
								onClick={() => setScope('variant')}
							>
								Variant
							</button>
							<button
								className="token-inspector__scope"
								data-active={effectiveScope === 'all'}
								aria-pressed={effectiveScope === 'all'}
								onClick={() => setScope('all')}
							>
								All
							</button>
						</div>
						<div className="token-inspector__context">{context}</div>
					</div>
					<div className="token-inspector__rows">
						{BUTTON_TOKENS.map((token) => {
							const row = getRowState(token.id)
							return (
								<div className="token-row" key={token.id}>
									<div className="token-row__label">
										{token.label}
										{row.modified && <div className="token-row__dot" />}
									</div>
									<div className="token-row__field">
										{token.kind === 'color' && (
											<label className="token-row__swatch" title="Pick a color">
												<span
													className="token-row__swatch-fill"
													style={{ background: row.value ?? 'transparent' }}
												/>
												<input
													type="color"
													aria-label={`${token.label} color`}
													value={row.value && HEX_RE.test(row.value) ? row.value : '#000000'}
													onFocus={markEditSession}
													onChange={(e) => applyToken(token.id, e.target.value)}
												/>
											</label>
										)}
										<input
											className="token-row__input"
											aria-label={token.label}
											value={row.value ?? ''}
											placeholder={row.value === null ? 'Mixed' : ''}
											spellCheck={false}
											onFocus={markEditSession}
											onChange={(e) => applyToken(token.id, e.target.value)}
										/>
									</div>
									<button
										className="token-row__reset"
										title="Reset"
										aria-label={`Reset ${token.label.toLowerCase()}`}
										disabled={!row.modified}
										onClick={() => resetToken(token.id)}
									>
										↺
									</button>
								</div>
							)
						})}
					</div>
					{/* [6] */}
					<button
						className="token-inspector__source-toggle"
						onClick={() => setIsSourceOpen(!isSourceOpen)}
					>
						Component source
						<span>{isSourceOpen ? '▾' : '▸'}</span>
					</button>
					{isSourceOpen && (
						<div className="token-inspector__source">
							<textarea
								className="token-inspector__source-textarea"
								aria-label="Component source"
								value={theme.css}
								spellCheck={false}
								wrap="off"
								onChange={(e) => setButtonCss(e.target.value)}
							/>
							<button
								className="token-inspector__source-reset"
								disabled={theme.css === DEFAULT_BUTTON_CSS}
								onClick={resetButtonCss}
							>
								Reset source
							</button>
						</div>
					)}
				</div>
			)}
			{showDefaultContent && <DefaultStylePanelContent />}
		</DefaultStylePanel>
	)
}

/*
A token inspector built on top of tldraw's own style panel. It edits the
button's design tokens at one of three scopes, plus the component's
stylesheet.

[1]
The panel composes rather than replaces. Token rows appear whenever button
frames are selected, or when nothing is selected at all. The default style
panel content renders alongside them when a selection includes ordinary
shapes, or when a drawing tool is active and has relevant styles.

[2]
The scope control reads like a design tool: "Selected" writes per-shape
overrides, "Variant" edits the base tokens of whichever variants are
selected, and "All" edits every variant. With nothing selected the only
meaningful target is all variants, so the panel falls back to that scope and
disables the other two.

[3]
Every token renders as a row showing its effective value at the current
scope. When the shapes or variants in scope disagree, the row shows a
"Mixed" placeholder — typing a value converges them. A row counts as
modified when an override exists (Selected) or a base token has drifted from
its default (Variant/All).

[4]
Selection-scoped edits go through the store, so they participate in undo.
Marking a history stopping point when an input gains focus makes the whole
editing session undo as one step, instead of one entry per keystroke — the
same pattern the default style panel uses. Variant and All edits live in the
theme atom outside the store, so no mark is needed.

[5]
Wrapping DefaultStylePanel (and forwarding its props) inherits the panel
chrome plus three behaviors every style panel needs: wheel events scroll the
panel instead of zooming the canvas, pointer moves over the panel are marked
as handled, and Escape returns focus to the canvas. DefaultStylePanel hides
itself when there are no relevant styles, so the token content passes an
empty style map to keep the panel visible.

[6]
The component's stylesheet, editable live. Each frame portals this CSS into
its iframe, so edits restyle every button on the canvas as you type.
*/
