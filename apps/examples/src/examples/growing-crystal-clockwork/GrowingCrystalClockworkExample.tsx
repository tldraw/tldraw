import { useCallback, useEffect, useRef } from 'react'
import { Editor, StateNode, type TLComponents, Tldraw, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'
import './growing-crystal-clockwork.css'
import {
	type SimState,
	addCrack,
	addCrystal,
	boostNearby,
	createSimState,
	render,
	tick,
} from './simulation'

// [1]
let simState: SimState = createSimState()

// [2]
class CrystalTool extends StateNode {
	static override id = 'crystal'
	private dragging = false
	private lastPos = { x: 0, y: 0 }

	override onPointerDown() {
		const { x, y } = this.editor.inputs.currentPagePoint
		this.dragging = true
		this.lastPos = { x, y }
		addCrack(simState, x, y)
		addCrystal(simState, x, y)
	}

	override onPointerMove() {
		if (!this.dragging) return
		const { x, y } = this.editor.inputs.currentPagePoint
		const dx = x - this.lastPos.x
		const dy = y - this.lastPos.y
		if (Math.sqrt(dx * dx + dy * dy) > 35) {
			addCrack(simState, x, y)
			addCrystal(simState, x, y, true)
			boostNearby(simState, x, y)
			this.lastPos = { x, y }
		}
	}

	override onPointerUp() {
		this.dragging = false
	}
}

// [3]
function CrystalCanvas() {
	const editor = useEditor()
	const canvasRef = useRef<HTMLCanvasElement>(null)

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		function onTick() {
			tick(simState)
			const parent = canvas!.parentElement
			if (!parent) return

			const dpr = window.devicePixelRatio || 1
			const w = parent.clientWidth
			const h = parent.clientHeight
			const tw = Math.round(w * dpr)
			const th = Math.round(h * dpr)

			if (canvas!.width !== tw || canvas!.height !== th) {
				canvas!.width = tw
				canvas!.height = th
			}

			const ctx = canvas!.getContext('2d')!
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
			render(ctx, simState, w, h, editor.getCamera())
		}

		editor.on('tick', onTick)
		return () => {
			editor.off('tick', onTick)
		}
	}, [editor])

	return <canvas ref={canvasRef} className="crystal-canvas" />
}

// [4]
const components: TLComponents = {
	InFrontOfTheCanvas: CrystalCanvas,
	Background: () => null,
	Toolbar: null,
	PageMenu: null,
	MainMenu: null,
	StylePanel: null,
	NavigationPanel: null,
	HelpMenu: null,
	DebugPanel: null,
	DebugMenu: null,
	Minimap: null,
}

const customTools = [CrystalTool]

export default function GrowingCrystalClockworkExample() {
	const handleMount = useCallback((editor: Editor) => {
		simState = createSimState()
		editor.setCurrentTool('crystal')
	}, [])

	return (
		<div className="tldraw__editor crystal-clockwork">
			<Tldraw tools={customTools} components={components} onMount={handleMount} />
		</div>
	)
}

/*
[1]
Module-level simulation state, reset on each mount. Keeps high-frequency
updates outside React's render cycle.

[2]
Custom tool captures pointer events. Clicks create cracks and crystal seeds.
Dragging lays mineral veins of smaller crystals and boosts nearby growth.

[3]
Full-viewport canvas rendered in front of the tldraw canvas. Each editor tick
advances the simulation and redraws with the camera transform applied for
zoom and pan support. pointer-events: none lets clicks pass through to the tool.

[4]
Default UI hidden for an immersive dark-canvas experience.
*/
