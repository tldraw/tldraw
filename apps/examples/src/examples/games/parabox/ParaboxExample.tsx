import { useEffect } from 'react'
import {
	Box,
	createShapeId,
	Editor,
	TLDefaultColorStyle,
	TLGeoShapeGeoStyle,
	TLShapePartial,
	Tldraw,
	useEditor,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { doMove, getWorld, hud$, loadLevel, restart, undo } from './game-state'
import { Dir, roomDepth, World } from './sim'
import './parabox.css'

// Page size of one root-level cell. Nested rooms shrink from here; the camera
// reframes onto the player's current room each move, so depth stays legible.
const ROOT_CELL = 72
// How many levels of nesting to draw below the player's room. The camera zooms
// into the player's room, so this is what's visible when you dive in — including
// the infinite nesting of a self-referential box.
const DEPTH_BELOW_PLAYER = 3
const MAX_DEPTH = 7

function geo(
	x: number,
	y: number,
	w: number,
	h: number,
	shape: TLGeoShapeGeoStyle,
	color: TLDefaultColorStyle,
	fill: 'none' | 'solid' | 'semi',
	size: 's' | 'm' = 's'
): TLShapePartial {
	return {
		id: createShapeId(),
		type: 'geo',
		x,
		y,
		isLocked: true,
		meta: { pb: true },
		props: { geo: shape, w: Math.max(1, w), h: Math.max(1, h), color, fill, dash: 'solid', size },
	} as TLShapePartial
}

// Build the whole nested scene as real tldraw shapes, and report the on-canvas
// rectangle of the player's current room so the camera can frame it.
function buildScene(world: World): { shapes: TLShapePartial[]; playerRect: Box | null } {
	const shapes: TLShapePartial[] = []
	const playerRoom = world.objects[world.playerId].roomId
	const maxDepth = Math.min(MAX_DEPTH, roomDepth(world, playerRoom) + DEPTH_BELOW_PLAYER)
	let playerRect: Box | null = null

	const renderRoom = (roomId: string, ox: number, oy: number, cell: number, depth: number) => {
		const room = world.rooms[roomId]
		const W = cell * room.w
		const H = cell * room.h

		// Room outline.
		shapes.push(geo(ox, oy, W, H, 'rectangle', 'grey', 'none', 'm'))
		// Frame the shallowest instance of the player's room.
		if (roomId === playerRoom && !playerRect) playerRect = new Box(ox, oy, W, H)

		// Targets (drawn under objects).
		for (const t of world.targets) {
			if (t.roomId !== roomId) continue
			const m = cell * 0.26
			shapes.push(geo(ox + t.x * cell + m, oy + t.y * cell + m, cell - 2 * m, cell - 2 * m, 'ellipse', 'light-red', 'none', 'm')) // prettier-ignore
		}

		for (let y = 0; y < room.h; y++) {
			for (let x = 0; x < room.w; x++) {
				const occ = room.cells[y][x]
				if (!occ) continue
				const o = world.objects[occ]
				const px = ox + x * cell
				const py = oy + y * cell
				const inset = cell * 0.1

				if (o.kind === 'wall') {
					shapes.push(geo(px, py, cell, cell, 'rectangle', 'grey', 'solid'))
				} else if (o.kind === 'block') {
					shapes.push(geo(px + inset, py + inset, cell - 2 * inset, cell - 2 * inset, 'rectangle', 'yellow', 'solid')) // prettier-ignore
				} else if (o.kind === 'player') {
					shapes.push(geo(px + inset, py + inset, cell - 2 * inset, cell - 2 * inset, 'ellipse', 'light-blue', 'solid')) // prettier-ignore
				} else if (o.kind === 'box') {
					shapes.push(
						geo(px, py, cell, cell, 'rectangle', o.color as TLDefaultColorStyle, 'solid', 'm')
					)
					shapes.push(geo(px + 2, py + 2, cell - 4, cell - 4, 'rectangle', o.color as TLDefaultColorStyle, 'none', 'm')) // prettier-ignore
					if (depth + 1 < maxDepth && o.interiorRoomId) {
						const inner = world.rooms[o.interiorRoomId]
						const pad = cell * 0.12
						const innerCell = (cell - 2 * pad) / Math.max(inner.w, inner.h)
						const iw = innerCell * inner.w
						const ih = innerCell * inner.h
						renderRoom(o.interiorRoomId, px + (cell - iw) / 2, py + (cell - ih) / 2, innerCell, depth + 1) // prettier-ignore
					}
				}
			}
		}
	}

	renderRoom(world.rootRoomId, 0, 0, ROOT_CELL, 0)
	return { shapes, playerRect }
}

// The room the camera is currently framing. We only animate the camera when the
// player changes rooms (entering/exiting a box) — within a room the camera holds
// still, and re-zooming every move would just interrupt its own animation.
let framedRoom: string | null = null

function render(editor: Editor, force = false) {
	const world = getWorld()
	const { shapes, playerRect } = buildScene(world)
	editor.run(
		() => {
			const old = editor.getCurrentPageShapes().filter((s) => s.meta?.pb)
			if (old.length) editor.deleteShapes(old.map((s) => s.id))
			editor.createShapes(shapes)
		},
		{ history: 'ignore', ignoreShapeLock: true }
	)
	const room = world.objects[world.playerId].roomId
	if (playerRect && (force || room !== framedRoom)) {
		framedRoom = room
		editor.zoomToBounds(playerRect, { inset: 60, animation: { duration: 200 } })
	}
}

function Game() {
	const editor = useEditor()

	useEffect(() => {
		// Raise the zoom ceiling so the camera can dive more than one box deep
		// (tldraw caps at 8x by default; two levels down needs ~30x). Deferred a
		// frame so it lands after tldraw's initial camera fit rather than
		// interrupting it.
		const raf = requestAnimationFrame(() => {
			editor.setCameraOptions({
				...editor.getCameraOptions(),
				zoomSteps: [0.05, 0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32, 64, 128, 256, 512],
			})
			loadLevel(0)
			render(editor, true)
		})

		const dirFor = (key: string): Dir | null => {
			switch (key) {
				case 'arrowup':
				case 'w':
					return 'up'
				case 'arrowdown':
				case 's':
					return 'down'
				case 'arrowleft':
				case 'a':
					return 'left'
				case 'arrowright':
				case 'd':
					return 'right'
			}
			return null
		}

		const onKeyDown = (e: KeyboardEvent) => {
			if (e.metaKey || e.ctrlKey || e.altKey) return
			const target = e.target as HTMLElement | null
			if (target?.matches('input, textarea, [contenteditable="true"]')) return
			const key = e.key.toLowerCase()
			const dir = dirFor(key)
			if (dir) {
				e.preventDefault()
				if (doMove(dir)) render(editor)
				return
			} else if (key === 'z') {
				undo()
				render(editor)
			} else if (key === 'r') {
				restart()
				render(editor, true)
			} else if (key === 'n') {
				loadLevel(hud$.get().level + 1)
				render(editor, true)
			} else if (key === 'p') {
				loadLevel(hud$.get().level - 1)
				render(editor, true)
			}
		}

		window.addEventListener('keydown', onKeyDown)
		return () => {
			cancelAnimationFrame(raf)
			window.removeEventListener('keydown', onKeyDown)
			editor.run(
				() => {
					const old = editor.getCurrentPageShapes().filter((s) => s.meta?.pb)
					if (old.length) editor.deleteShapes(old.map((s) => s.id))
				},
				{ ignoreShapeLock: true }
			)
		}
	}, [editor])

	return null
}

function Hud() {
	const hud = useValue('pb-hud', () => hud$.get(), [])
	const editor = useEditor()
	return (
		<div className="pb-hud">
			<div className="pb-hud__title">
				<span className="pb-hud__level">
					{hud.level + 1}/{hud.total}
				</span>
				<span className="pb-hud__name">{hud.name}</span>
			</div>
			<div className="pb-hud__keys">
				<span>
					<kbd>WASD</kbd> move
				</span>
				<span>
					<kbd>Z</kbd> undo
				</span>
				<span>
					<kbd>R</kbd> restart
				</span>
				<span>scroll to zoom</span>
			</div>
			{hud.won && (
				<div className="pb-banner">
					<span>Solved in {hud.moves} moves</span>
					<button
						className="pb-next"
						onClick={() => {
							loadLevel(hud.level + 1)
							render(editor, true)
						}}
					>
						Next <kbd>N</kbd>
					</button>
				</div>
			)}
		</div>
	)
}

const options = { createTextOnCanvasDoubleClick: false }

export default function ParaboxExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw options={options} hideUi>
				<Game />
				<Hud />
			</Tldraw>
		</div>
	)
}
