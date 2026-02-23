import { useEffect, useState } from 'react'
import { StateNode, TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import {
	type PaintMode,
	type SimState,
	clearAll,
	createSimState,
	dropSpore,
	placeSalt,
	placeSugar,
	tick,
} from './simulation'
import './slime-mold-fermentation.css'

// --- Shared mutable state ---

let simState: SimState = createSimState()
let paintMode: PaintMode = 'sugar'

const SUGAR_MIN_DIST = 18
const SALT_MIN_DIST = 14

// [1]
export class PaintTool extends StateNode {
	static override id = 'paint'
	private isPainting = false
	private lastPos: { x: number; y: number } | null = null

	override onEnter() {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
		this.lastPos = null
	}

	override onPointerDown() {
		this.isPainting = true
		this.paint(true)
	}

	override onPointerMove() {
		if (this.isPainting) this.paint(false)
	}

	override onPointerUp() {
		this.isPainting = false
		this.lastPos = null
	}

	override onCancel() {
		this.isPainting = false
		this.lastPos = null
	}

	private paint(isClick: boolean) {
		const point = this.editor.inputs.currentPagePoint

		if (paintMode === 'sugar') {
			if (!isClick && this.lastPos) {
				const dx = point.x - this.lastPos.x
				const dy = point.y - this.lastPos.y
				if (dx * dx + dy * dy < SUGAR_MIN_DIST * SUGAR_MIN_DIST) return
			}
			placeSugar(simState, this.editor, point.x, point.y)
			this.lastPos = { x: point.x, y: point.y }
		} else if (paintMode === 'salt') {
			if (!isClick && this.lastPos) {
				const dx = point.x - this.lastPos.x
				const dy = point.y - this.lastPos.y
				if (dx * dx + dy * dy < SALT_MIN_DIST * SALT_MIN_DIST) return
			}
			placeSalt(simState, this.editor, point.x, point.y)
			this.lastPos = { x: point.x, y: point.y }
		} else {
			dropSpore(simState, this.editor, point.x, point.y)
			this.isPainting = false
		}
	}
}

// [2]
function SimulationTicker() {
	const editor = useEditor()

	useEffect(() => {
		function onTick() {
			tick(simState, editor)
		}
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
	const [mode, setMode] = useState<PaintMode>('sugar')

	useEffect(() => {
		paintMode = mode
	}, [mode])

	return (
		<div className="sim-controls">
			<button className={mode === 'sugar' ? 'active' : ''} onClick={() => setMode('sugar')}>
				Sugar
			</button>
			<button className={mode === 'salt' ? 'active' : ''} onClick={() => setMode('salt')}>
				Salt
			</button>
			<button className={mode === 'spore' ? 'active' : ''} onClick={() => setMode('spore')}>
				Drop spore
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

export default function SlimeMoldFermentationExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={[PaintTool]}
				components={components}
				onMount={(editor) => {
					simState = createSimState()
					editor.setCurrentTool('paint')
				}}
			>
				<SimulationTicker />
			</Tldraw>
		</div>
	)
}

/*
[1]
A single tool handles all three painting modes. The current mode comes from
the module-level `paintMode` variable, which stays in sync with the React
controls. Sugar and salt are stamped at minimum-distance intervals along
drag paths; spores are placed on single clicks.

[2]
A headless component that drives the simulation forward on each editor tick.
Rendered as a child of <Tldraw> so it has access to the editor context.

[3]
The control panel is rendered in the TopPanel slot, which is part of tldraw's
UI layer and receives pointer events normally (unlike InFrontOfTheCanvas
which sits inside the canvas event-capture layer).

[4]
All default tldraw UI is hidden since this example uses its own controls
and a custom tool. The native canvas with pan/zoom still works via
scroll wheel and trackpad gestures.
*/
