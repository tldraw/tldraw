import { useCallback } from 'react'
import {
	DefaultStylePanel,
	DefaultStylePanelContent,
	Editor,
	Tldraw,
	useEditor,
	useRelevantStyles,
} from 'tldraw'
import { DICE_TYPE, DiceShapeUtil } from './dice/DiceShapeUtil'
import { DiceSidesStyle, POLY_DICE_TYPE, PolyDiceShapeUtil } from './dice/PolyDiceShapeUtil'

const shapeUtils = [DiceShapeUtil, PolyDiceShapeUtil]

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

function App() {
	const handleMount = useCallback((editor: Editor) => {
		;(window as any).editor = editor
		if (editor.getCurrentPageShapeIds().size > 0) return

		// Place two D6 dice and a sample of poly dice
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
	}, [])

	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw
				shapeUtils={shapeUtils}
				onMount={handleMount}
				persistenceKey="tabletop"
				components={{ StylePanel: CustomStylePanel }}
			/>
		</div>
	)
}

export default App
