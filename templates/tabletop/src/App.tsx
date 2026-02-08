import { useCallback } from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultStylePanel,
	DefaultStylePanelContent,
	Editor,
	TLComponents,
	TLUiContextMenuProps,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import { CARD_TYPE, CardShapeUtil } from './cards/CardShapeUtil'
import { CARD_BOX_TYPE, CardBoxShapeUtil } from './cards/DeckShapeUtil'
import { fanCards, flipCards, getSelectedCardIds } from './cards/card-helpers'
import { DICE_TYPE, DiceShapeUtil } from './dice/DiceShapeUtil'
import { DiceSidesStyle, POLY_DICE_TYPE, PolyDiceShapeUtil } from './dice/PolyDiceShapeUtil'

const shapeUtils = [DiceShapeUtil, PolyDiceShapeUtil, CardShapeUtil, CardBoxShapeUtil]

// --- Style panel (poly dice sides selector) ---

const SIDES_LABELS: Record<number, string> = {
	4: 'D4',
	6: 'D6',
	8: 'D8',
	10: 'D10',
	12: 'D12',
	20: 'D20',
	100: 'D%',
}

function CustomStylePanel() {
	const editor = useEditor()
	const styles = useRelevantStyles()
	if (!styles) return null

	const sidesStyle = styles.get(DiceSidesStyle)

	return (
		<DefaultStylePanel>
			<DefaultStylePanelContent />
			{sidesStyle !== undefined && (
				<div style={{ padding: '4px 8px' }}>
					<label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
						<span>Sides</span>
						<select
							style={{ flex: 1, padding: 4 }}
							value={sidesStyle.type === 'mixed' ? '' : sidesStyle.value}
							onChange={(e) => {
								editor.markHistoryStoppingPoint()
								const value = DiceSidesStyle.validate(+e.currentTarget.value)
								editor.setStyleForSelectedShapes(DiceSidesStyle, value)
							}}
						>
							{sidesStyle.type === 'mixed' ? <option value="">Mixed</option> : null}
							{[4, 6, 8, 10, 12, 20, 100].map((s) => (
								<option key={s} value={s}>
									{SIDES_LABELS[s]}
								</option>
							))}
						</select>
					</label>
				</div>
			)}
		</DefaultStylePanel>
	)
}

// --- Context menu (card actions) ---

function TabletopContextMenuItems() {
	const editor = useEditor()
	const cardIds = getSelectedCardIds(editor)

	const hasCards = cardIds.length > 0

	if (!hasCards) return null

	return (
		<TldrawUiMenuGroup id="tabletop-actions">
			<TldrawUiMenuItem
				id="flip-cards"
				label={cardIds.length === 1 ? 'Flip card' : 'Flip cards'}
				onSelect={() => flipCards(editor, cardIds)}
			/>
			{cardIds.length > 1 && (
				<TldrawUiMenuItem
					id="fan-cards"
					label="Fan cards"
					onSelect={() => {
						const bounds = editor.getSelectionPageBounds()
						if (bounds) {
							fanCards(editor, cardIds, { x: bounds.midX, y: bounds.midY })
						}
					}}
				/>
			)}
		</TldrawUiMenuGroup>
	)
}

function CustomContextMenu(props: TLUiContextMenuProps) {
	return (
		<DefaultContextMenu {...props}>
			<TabletopContextMenuItems />
			<DefaultContextMenuContent />
		</DefaultContextMenu>
	)
}

const components: TLComponents = {
	StylePanel: CustomStylePanel,
	ContextMenu: CustomContextMenu,
}

// --- App ---

function App() {
	const handleMount = useCallback((editor: Editor) => {
		;(window as any).editor = editor

		// Uniqueness side-effect: prevent duplicate cards (same suit+rank) on the page
		editor.sideEffects.registerAfterCreateHandler('shape', (shape) => {
			if (shape.type !== CARD_TYPE) return
			const newCard = shape as any
			const pageId = editor.getCurrentPageId()
			const allIds = editor.getSortedChildIdsForParent(pageId)
			for (const id of allIds) {
				if (id === shape.id) continue
				const existing = editor.getShape(id)
				if (
					existing &&
					existing.type === CARD_TYPE &&
					(existing as any).props.suit === newCard.props.suit &&
					(existing as any).props.rank === newCard.props.rank
				) {
					// Duplicate found — delete the newly created one
					editor.deleteShapes([shape.id])
					return
				}
			}
		})

		if (editor.getCurrentPageShapeIds().size > 0) return

		// Dice: two D6 and a sample of poly dice
		editor.createShapes([
			{
				type: DICE_TYPE,
				x: 300,
				y: 300,
			},
			{
				type: DICE_TYPE,
				x: 460,
				y: 300,
			},
			{
				type: POLY_DICE_TYPE,
				x: 300,
				y: 460,
				props: { sides: 20 },
			},
			{
				type: POLY_DICE_TYPE,
				x: 460,
				y: 460,
				props: { sides: 12 },
			},
			{
				type: POLY_DICE_TYPE,
				x: 620,
				y: 460,
				props: { sides: 8 },
			},
			{
				type: POLY_DICE_TYPE,
				x: 620,
				y: 300,
				props: { sides: 4 },
			},
		])

		// A card box (starts full, double-click to deal)
		editor.createShape({
			type: CARD_BOX_TYPE,
			x: 100,
			y: 300,
		})
	}, [])

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={handleMount}
				persistenceKey="tabletop"
				components={components}
			/>
		</div>
	)
}

export default App
