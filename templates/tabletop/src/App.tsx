import { useCallback } from 'react'
import {
	DefaultContextMenu,
	DefaultContextMenuContent,
	DefaultStylePanel,
	DefaultStylePanelContent,
	Editor,
	TLComponents,
	TLShapeId,
	TLUiContextMenuProps,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
	createShapeId,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import { CardShapeUtil } from './cards/CardShapeUtil'
import { DECK_TYPE, DeckShapeUtil } from './cards/DeckShapeUtil'
import { createStandardDeck } from './cards/card-data'
import {
	collectIntoDeck,
	dealTopCard,
	fanCards,
	flipCards,
	getSelectedCardAndDeckIds,
	shuffleDeck,
} from './cards/card-helpers'
import { DICE_TYPE, DiceShapeUtil } from './dice/DiceShapeUtil'
import { DiceSidesStyle, POLY_DICE_TYPE, PolyDiceShapeUtil } from './dice/PolyDiceShapeUtil'

const shapeUtils = [DiceShapeUtil, PolyDiceShapeUtil, CardShapeUtil, DeckShapeUtil]

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

// --- Context menu (card/deck actions) ---

function TabletopContextMenuItems() {
	const editor = useEditor()
	const { cardIds, deckIds } = getSelectedCardAndDeckIds(editor)

	const hasCards = cardIds.length > 0
	const hasDeck = deckIds.length > 0

	if (!hasCards && !hasDeck) return null

	return (
		<TldrawUiMenuGroup id="tabletop-actions">
			{hasCards && (
				<TldrawUiMenuItem
					id="flip-cards"
					label={cardIds.length === 1 ? 'Flip card' : 'Flip cards'}
					onSelect={() => flipCards(editor, cardIds)}
				/>
			)}
			{hasCards && cardIds.length > 1 && (
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
			{hasDeck &&
				deckIds.map((deckId) => {
					const deck = editor.getShape(deckId)
					if (!deck) return null
					return (
						<TldrawUiMenuItem
							key={`shuffle-${deckId}`}
							id="shuffle-deck"
							label="Shuffle deck"
							onSelect={() => shuffleDeck(editor, deckId)}
						/>
					)
				})}
			{hasDeck &&
				deckIds.map((deckId) => (
					<TldrawUiMenuItem
						key={`deal-${deckId}`}
						id="deal-card"
						label="Deal card"
						onSelect={() => {
							dealTopCard(editor, deckId)
						}}
					/>
				))}
			{hasCards && hasDeck && (
				<TldrawUiMenuItem
					id="collect-into-deck"
					label="Collect into deck"
					onSelect={() => collectIntoDeck(editor, cardIds, deckIds[0])}
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

		// A deck of 52 cards
		const deckId: TLShapeId = createShapeId()
		editor.createShape({
			id: deckId,
			type: DECK_TYPE,
			x: 100,
			y: 300,
		})
		createStandardDeck(editor, deckId)

		// Deal a few cards face-up so the user can see them immediately
		for (let i = 0; i < 3; i++) {
			dealTopCard(editor, deckId, { x: 800 + i * 100, y: 300 })
		}
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
