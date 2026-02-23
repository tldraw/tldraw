import { useEffect } from 'react'
import { StateNode, TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './composting-undo-history.css'
import {
	type SimState,
	ROOT_SPACING,
	clearAll,
	compostPlant,
	createSimState,
	findPlantAtPoint,
	seedScene,
	tick,
} from './simulation'

// ---- Module-level state ----

let simState: SimState = createSimState()

// [1]
export class CompostTool extends StateNode {
	static override id = 'compost'

	private draggingIdx = -1
	private startY = 0
	private isDragging = false

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

	override onPointerDown() {
		const pt = this.editor.inputs.currentPagePoint
		const idx = findPlantAtPoint(simState, this.editor, pt.x, pt.y)
		if (idx === -1) return

		this.draggingIdx = idx
		this.startY = pt.y
		this.isDragging = true
	}

	override onPointerMove() {
		if (!this.isDragging || this.draggingIdx === -1) return

		const pt = this.editor.inputs.currentPagePoint
		const dy = Math.max(0, pt.y - this.startY)
		const plant = simState.plants[this.draggingIdx]
		if (!plant || plant.history.length === 0) return

		const maxDy = plant.history.length * ROOT_SPACING
		const clamped = Math.min(dy, maxDy)

		// Move shape downward along root path
		this.editor.updateShape({
			id: plant.id,
			type: 'geo',
			x: plant.x - plant.currentProps.w / 2,
			y: plant.y + clamped - plant.currentProps.h / 2,
			opacity: 1 - (clamped / maxDy) * 0.4,
		})

		// Highlight ghost nodes as shape passes them
		for (let i = 0; i < plant.history.length; i++) {
			const threshold = (i + 1) * ROOT_SPACING - 20
			this.editor.updateShape({
				id: plant.history[i].ghostId,
				type: 'geo',
				opacity: clamped >= threshold ? 0.7 : 0.25,
			})
		}
	}

	override onPointerUp() {
		if (!this.isDragging || this.draggingIdx === -1) {
			this.finish()
			return
		}

		const pt = this.editor.inputs.currentPagePoint
		const dy = pt.y - this.startY
		const plant = simState.plants[this.draggingIdx]

		if (plant) {
			// Snap shape back to original position
			this.editor.updateShape({
				id: plant.id,
				type: 'geo',
				x: plant.x - plant.currentProps.w / 2,
				y: plant.y - plant.currentProps.h / 2,
				opacity: 1,
			})

			// Reset ghost highlights
			for (const h of plant.history) {
				this.editor.updateShape({ id: h.ghostId, type: 'geo', opacity: 0.25 })
			}

			// Compost if dragged far enough downward
			if (dy > ROOT_SPACING * 0.6 && plant.history.length > 0) {
				compostPlant(simState, this.editor, this.draggingIdx)
			}
		}

		this.finish()
	}

	override onCancel() {
		if (this.isDragging && this.draggingIdx !== -1) {
			const plant = simState.plants[this.draggingIdx]
			if (plant) {
				this.editor.updateShape({
					id: plant.id,
					type: 'geo',
					x: plant.x - plant.currentProps.w / 2,
					y: plant.y - plant.currentProps.h / 2,
					opacity: 1,
				})
				for (const h of plant.history) {
					this.editor.updateShape({ id: h.ghostId, type: 'geo', opacity: 0.25 })
				}
			}
		}
		this.finish()
	}

	private finish() {
		this.isDragging = false
		this.draggingIdx = -1
	}
}

// [2]
function SimulationTicker() {
	const editor = useEditor()
	useEffect(() => {
		const onTick = () => tick(simState, editor)
		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
		}
	}, [editor])
	return null
}

// [3]
function ControlPanel() {
	const editor = useEditor()
	return (
		<div className="compost-controls">
			<span className="compost-hint">Drag shapes downward to compost their history</span>
			<button
				onClick={() => {
					clearAll(simState, editor)
					seedScene(simState, editor)
				}}
			>
				Reseed
			</button>
			<button onClick={() => clearAll(simState, editor)}>Clear</button>
		</div>
	)
}

// [4]
const components: TLComponents = {
	TopPanel: ControlPanel,
	Toolbar: null,
	PageMenu: null,
	MainMenu: null,
	StylePanel: null,
	NavigationPanel: null,
	HelpMenu: null,
	DebugMenu: null,
	DebugPanel: null,
	MenuPanel: null,
	ActionsMenu: null,
	QuickActions: null,
	ZoomMenu: null,
	SharePanel: null,
	HelperButtons: null,
	Minimap: null,
}

export default function CompostingUndoHistoryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={[CompostTool]}
				components={components}
				onMount={(editor) => {
					simState = createSimState()
					seedScene(simState, editor)
					editor.setCurrentTool('compost')
				}}
			>
				<SimulationTicker />
			</Tldraw>
		</div>
	)
}

/*
[1]
Custom tool for the composting interaction. When the user clicks on a tracked
plant shape and drags downward, the shape visually travels down along its root
system of past states. Ghost history nodes brighten as the shape passes them.
If dragged far enough (past ROOT_SPACING * 0.6), the most recent mutation is
"composted" — the shape reverts and the undone traits flow as particles to
neighboring shapes.

[2]
Headless component that drives the simulation on each editor tick.
Auto-mutates a random plant every ~100 ticks to build up history roots,
and animates compost particles along underground bezier arcs.

[3]
Control panel rendered in the TopPanel slot. Shows a hint about the
drag interaction and buttons to reseed or clear the canvas.

[4]
All default tldraw UI is hidden since this example uses its own controls
and a custom tool. Native canvas pan/zoom still works via scroll wheel
and trackpad gestures.
*/
