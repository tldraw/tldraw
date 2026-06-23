import { useEffect, useRef } from 'react'
import {
	Box,
	DEFAULT_THEME,
	Editor,
	getIndices,
	TLAnyOverlayUtilConstructor,
	TLGeoShapeGeoStyle,
	TLShapeId,
	TLThemeDefaultColors,
	Tldraw,
	createShapeId,
	defaultOverlayUtils,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { GEO_FOR_MACHINE, MACHINE_R, WORLD } from './constants'
import { FactoryTool } from './FactoryTool'
import { getWorld, hud$, publish, resetWorld } from './game-state'
import { BeltPreviewOverlayUtil } from './overlays/BeltPreviewOverlayUtil'
import { ItemOverlayUtil } from './overlays/ItemOverlayUtil'
import { MachineOverlayUtil } from './overlays/MachineOverlayUtil'
import { traceShape } from './shapes'
import { beltPoints, stepWorld, World } from './sim'
import './shape-factory.css'

// Items move every frame, so they (and the machine glyphs and drag preview) live
// on the overlay canvas; machines and belts are real tldraw shapes synced below.
const overlayUtils: TLAnyOverlayUtilConstructor[] = [
	...defaultOverlayUtils,
	MachineOverlayUtil,
	ItemOverlayUtil,
	BeltPreviewOverlayUtil,
]

const customTools = [FactoryTool]

const machineShapeId = (id: number) => createShapeId(`sf-machine-${id}`)
const beltShapeId = (id: number) => createShapeId(`sf-belt-${id}`)

// Mirror the sim's machines and belts into real, locked tldraw shapes. Machines
// are `geo` shapes (a distinct geo style per kind); belts are `line` shapes in
// the tldraw palette. Only structural changes trigger this, so it's cheap.
function syncShapes(
	editor: Editor,
	world: World,
	synced: { machines: Set<number>; belts: Set<number> }
) {
	editor.run(
		() => {
			for (const m of world.machines) {
				if (synced.machines.has(m.id)) continue
				synced.machines.add(m.id)
				editor.createShape({
					id: machineShapeId(m.id),
					type: 'geo',
					x: m.x - MACHINE_R,
					y: m.y - MACHINE_R,
					isLocked: true,
					meta: { sf: 'machine' },
					props: {
						geo: GEO_FOR_MACHINE[m.kind] as TLGeoShapeGeoStyle,
						w: MACHINE_R * 2,
						h: MACHINE_R * 2,
						color: 'black',
						fill: 'none',
						dash: 'solid',
						size: 'm',
					},
				})
			}

			const beltIds: TLShapeId[] = []
			const live = new Set<number>()
			for (const belt of world.belts) {
				const pts = beltPoints(world, belt)
				if (!pts) continue
				live.add(belt.id)
				const id = beltShapeId(belt.id)
				beltIds.push(id)
				if (synced.belts.has(belt.id)) continue
				synced.belts.add(belt.id)
				const { from, to } = pts
				const indices = getIndices(2)
				editor.createShape({
					id,
					type: 'line' as const,
					x: from.x,
					y: from.y,
					isLocked: true,
					meta: { sf: 'belt' },
					props: {
						spline: 'line' as const,
						color: 'grey' as const,
						size: 'l' as const,
						dash: 'solid' as const,
						points: {
							[indices[0]]: { id: indices[0], index: indices[0], x: 0, y: 0 },
							[indices[1]]: {
								id: indices[1],
								index: indices[1],
								x: to.x - from.x,
								y: to.y - from.y,
							},
						},
					},
				})
			}

			// Remove shapes for belts the player has deleted.
			for (const id of synced.belts) {
				if (!live.has(id)) {
					editor.deleteShape(beltShapeId(id))
					synced.belts.delete(id)
				}
			}

			// Keep belts tucked behind the machines they connect.
			if (beltIds.length) editor.sendToBack(beltIds)
		},
		{ history: 'ignore', ignoreShapeLock: true }
	)
}

function deleteGameShapes(editor: Editor) {
	const ids = editor
		.getCurrentPageShapes()
		.filter((s) => s.meta?.sf)
		.map((s) => s.id)
	if (ids.length) editor.run(() => editor.deleteShapes(ids), { ignoreShapeLock: true })
}

function fitMap(editor: Editor) {
	const bounds = new Box(WORLD.minX, WORLD.minY, WORLD.maxX - WORLD.minX, WORLD.maxY - WORLD.minY)
	editor.zoomToBounds(bounds, { inset: 48, animation: { duration: 0 } })
}

function GameRunner() {
	const editor = useEditor()

	useEffect(() => {
		resetWorld()
		deleteGameShapes(editor)
		const synced = { machines: new Set<number>(), belts: new Set<number>() }
		let lastVersion = -1

		const sync = () => {
			const world = getWorld()
			if (world.structureVersion !== lastVersion) {
				lastVersion = world.structureVersion
				syncShapes(editor, world, synced)
			}
		}
		sync()
		fitMap(editor)

		const onTick = (elapsedMs: number) => {
			// Clamp so a backgrounded tab doesn't fast-forward the whole factory.
			stepWorld(getWorld(), Math.min(50, elapsedMs))
			publish()
			sync()
		}
		editor.on('tick', onTick)

		return () => {
			editor.off('tick', onTick)
			deleteGameShapes(editor)
		}
	}, [editor])

	return null
}

// A small canvas that draws the item the hub currently wants, so the goal is
// always visible in the HUD even if the hub scrolls off-screen.
function RequestBadge() {
	const editor = useEditor()
	const ref = useRef<HTMLCanvasElement>(null)
	const request = useValue('sf-request', () => hud$.get().request, [])
	const dark = useValue('sf-dark', () => editor.getColorMode() === 'dark', [editor])

	useEffect(() => {
		const canvas = ref.current
		const ctx = canvas?.getContext('2d')
		if (!canvas || !ctx) return
		const size = 40
		const dpr = window.devicePixelRatio || 1
		canvas.width = size * dpr
		canvas.height = size * dpr
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
		ctx.clearRect(0, 0, size, size)
		const theme = (
			dark ? DEFAULT_THEME.colors.dark : DEFAULT_THEME.colors.light
		) as TLThemeDefaultColors
		const palette = theme[request.color]
		traceShape(ctx, request.shape, size / 2, size / 2, 13)
		ctx.fillStyle = palette.solid
		ctx.fill()
		ctx.lineWidth = 2
		ctx.strokeStyle = palette.fill
		ctx.stroke()
	}, [request, dark])

	return <canvas ref={ref} className="sf-badge" style={{ width: 40, height: 40 }} />
}

function Hud() {
	const score = useValue('sf-score', () => hud$.get().score, [])
	return (
		<div className="sf-hud">
			<div className="sf-hud__stat sf-hud__stat--goal">
				<RequestBadge />
				<span className="sf-hud__label">wanted</span>
			</div>
			<div className="sf-hud__stat">
				<span className="sf-hud__value">{score}</span>
				<span className="sf-hud__label">delivered</span>
			</div>
		</div>
	)
}

function Hint() {
	const delivered = useValue('sf-delivered', () => hud$.get().score > 0, [])
	if (delivered) return null
	return (
		<div className="sf-hint">
			Route raw shapes through painters and into the hub to make the shape it wants (shown
			top-left). Drag between machines to lay a belt; click a belt to remove it.
		</div>
	)
}

// Machines and belts are the only interactive surface, so hide the editor UI and
// stop double-clicks from dropping stray text shapes onto the map.
const options = { createTextOnCanvasDoubleClick: false }

export default function ShapeFactoryExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw
				tools={customTools}
				initialState="factory"
				overlayUtils={overlayUtils}
				options={options}
				hideUi
			>
				<GameRunner />
				<Hud />
				<Hint />
			</Tldraw>
		</div>
	)
}
