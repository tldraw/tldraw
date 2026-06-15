import { useEffect, useRef } from 'react'
import {
	Box,
	Editor,
	TLDefaultColorStyle,
	TLGeoShape,
	TLShapeId,
	TLShapePartial,
	Tldraw,
	createShapeId,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import {
	Column,
	Input,
	Player,
	Segment,
	castColumns,
	createInput,
	createPlayer,
	updatePlayer,
} from './engine'

// There's a guide at the bottom of this file!

// Layout, all in page coordinates. The "map" (where you draw walls) sits on the
// left; the projected first-person "viewport" sits on the right.
const VIEWPORT = { x: 660, y: 40, w: 640, h: 400 }
const COLUMNS = 64
const COLUMN_W = VIEWPORT.w / COLUMNS
// Wall apparent height = HEIGHT_K / distance. Tuned so a wall a player's-width
// away roughly fills the viewport.
const HEIGHT_K = 26000

// Any shape of one of these types that the user draws becomes a wall. (Engine-
// owned shapes are tagged in meta.rc and skipped, so these are the user's.)
const WALL_TYPES = new Set(['geo', 'line', 'draw', 'arrow'])

// Shapes the engine owns are tagged in `meta.rc` so we can tell them apart from
// the walls the user draws (which are untagged).
interface SceneIds {
	strips: TLShapeId[]
	player: TLShapeId
	nose: TLShapeId
}

function geo(
	id: TLShapeId,
	x: number,
	y: number,
	props: Partial<TLGeoShape['props']>,
	rc: string
): TLShapePartial<TLGeoShape> {
	return { id, type: 'geo', x, y, props, meta: { rc } }
}

function buildScene(editor: Editor): SceneIds {
	const create: TLShapePartial<TLGeoShape>[] = []

	// Background: ceiling (top half) and floor (bottom half) of the viewport.
	create.push(
		geo(
			createShapeId(),
			VIEWPORT.x,
			VIEWPORT.y,
			{
				geo: 'rectangle',
				w: VIEWPORT.w,
				h: VIEWPORT.h / 2,
				color: 'light-blue',
				fill: 'solid',
				dash: 'solid',
				size: 's',
			} as Partial<TLGeoShape['props']>,
			'bg'
		),
		geo(
			createShapeId(),
			VIEWPORT.x,
			VIEWPORT.y + VIEWPORT.h / 2,
			{
				geo: 'rectangle',
				w: VIEWPORT.w,
				h: VIEWPORT.h / 2,
				color: 'grey',
				fill: 'solid',
				dash: 'solid',
				size: 's',
			} as Partial<TLGeoShape['props']>,
			'bg'
		)
	)

	// One rectangle per screen column — these are the 3D view, rebuilt each frame.
	const strips: TLShapeId[] = []
	for (let i = 0; i < COLUMNS; i++) {
		const id = createShapeId()
		strips.push(id)
		create.push(
			geo(
				id,
				VIEWPORT.x + i * COLUMN_W,
				VIEWPORT.y + VIEWPORT.h / 2,
				{
					geo: 'rectangle',
					w: COLUMN_W + 1,
					h: 2,
					color: 'black',
					fill: 'solid',
					dash: 'solid',
					size: 's',
				} as Partial<TLGeoShape['props']>,
				'strip'
			)
		)
	}

	// Viewport frame.
	create.push(
		geo(
			createShapeId(),
			VIEWPORT.x - 2,
			VIEWPORT.y - 2,
			{
				geo: 'rectangle',
				w: VIEWPORT.w + 4,
				h: VIEWPORT.h + 4,
				color: 'black',
				fill: 'none',
				dash: 'solid',
				size: 's',
			} as Partial<TLGeoShape['props']>,
			'frame'
		)
	)

	// Starter level: walls the user can drag, delete, recolour, or add to. These
	// are untagged, so the engine treats them as walls.
	const wall = (x: number, y: number, w: number, h: number, color: TLDefaultColorStyle) =>
		create.push({
			id: createShapeId(),
			type: 'geo',
			x,
			y,
			props: {
				geo: 'rectangle',
				w,
				h,
				color,
				fill: 'solid',
				dash: 'solid',
				size: 's',
			} as Partial<TLGeoShape['props']>,
		})
	wall(20, 20, 520, 12, 'black') // top
	wall(20, 508, 520, 12, 'black') // bottom
	wall(20, 20, 12, 500, 'black') // left
	wall(508, 20, 12, 500, 'black') // right
	wall(150, 150, 70, 70, 'blue')
	wall(330, 300, 90, 40, 'green')
	wall(250, 90, 12, 150, 'red')
	wall(360, 120, 60, 60, 'violet')

	// Player marker and a smaller "nose" dot that shows facing direction.
	const player = createShapeId()
	const nose = createShapeId()
	create.push(
		geo(
			player,
			0,
			0,
			{
				geo: 'ellipse',
				w: 16,
				h: 16,
				color: 'orange',
				fill: 'solid',
				dash: 'solid',
				size: 's',
			} as Partial<TLGeoShape['props']>,
			'player'
		),
		geo(
			nose,
			0,
			0,
			{
				geo: 'ellipse',
				w: 8,
				h: 8,
				color: 'black',
				fill: 'solid',
				dash: 'solid',
				size: 's',
			} as Partial<TLGeoShape['props']>,
			'player'
		)
	)

	editor.run(() => editor.createShapes(create), { history: 'ignore' })
	return { strips, player, nose }
}

// Read every user-drawn shape as wall segments in page coordinates. This runs
// every frame, so drawing, dragging, resizing, or deleting a shape shows up in
// the 3D view immediately.
function readWalls(editor: Editor): Segment[] {
	const segments: Segment[] = []
	for (const shape of editor.getCurrentPageShapes()) {
		if (shape.meta?.rc) continue // skip engine-owned shapes
		if (!WALL_TYPES.has(shape.type)) continue
		const g = editor.getShapeGeometry(shape)
		// boundsVertices is the outline in local coords, excluding any text label.
		const verts = editor.getShapePageTransform(shape).applyToPoints(g.boundsVertices)
		if (verts.length < 2) continue
		// Ignore anything sitting in the viewport half of the canvas.
		const cx = verts.reduce((sum, v) => sum + v.x, 0) / verts.length
		if (cx > VIEWPORT.x - 40) continue
		const color = ((shape.props as { color?: string }).color ?? 'black') as string
		// Closed shapes (rectangles, ellipses) wrap around; open ones (lines,
		// freehand strokes) don't.
		const edgeCount = g.isClosed ? verts.length : verts.length - 1
		for (let i = 0; i < edgeCount; i++) {
			const a = verts[i]
			const b = verts[(i + 1) % verts.length]
			segments.push({ ax: a.x, ay: a.y, bx: b.x, by: b.y, color })
		}
	}
	return segments
}

function clamp(v: number, lo: number, hi: number) {
	return Math.max(lo, Math.min(hi, v))
}

// Push the cast result and player position into the engine-owned shapes.
function reconcile(editor: Editor, ids: SceneIds, columns: Column[], player: Player) {
	const updates: TLShapePartial<TLGeoShape>[] = []
	for (let i = 0; i < COLUMNS; i++) {
		const col = columns[i]
		const h = col.dist === Infinity ? 2 : clamp(HEIGHT_K / col.dist, 2, VIEWPORT.h)
		updates.push({
			id: ids.strips[i],
			type: 'geo',
			x: VIEWPORT.x + i * COLUMN_W,
			y: VIEWPORT.y + (VIEWPORT.h - h) / 2,
			props: {
				w: COLUMN_W + 1,
				h,
				color: (col.dist === Infinity ? 'grey' : col.color) as TLDefaultColorStyle,
			},
		})
	}
	updates.push({ id: ids.player, type: 'geo', x: player.x - 8, y: player.y - 8 })
	updates.push({
		id: ids.nose,
		type: 'geo',
		x: player.x + player.dirX * 14 - 4,
		y: player.y + player.dirY * 14 - 4,
	})
	editor.run(() => editor.updateShapes(updates), { history: 'ignore' })
}

function Engine() {
	const editor = useEditor()
	const playerRef = useRef<Player>(createPlayer(80, 270))
	const inputRef = useRef<Input>(createInput())

	useEffect(() => {
		const ids = buildScene(editor)
		editor.zoomToBounds(new Box(-20, -20, 1360, 600), { inset: 32, immediate: true })

		const player = playerRef.current
		const input = inputRef.current

		const onTick = (elapsedMs: number) => {
			const dt = Math.min(50, elapsedMs)
			const walls = readWalls(editor)
			updatePlayer(player, walls, input, dt)
			reconcile(editor, ids, castColumns(player, walls, COLUMNS), player)
		}
		editor.on('tick', onTick)

		// Continuous keyboard state for walking. Listen in the capture phase on
		// window so we get the keys before tldraw's own shortcuts and can stop them
		// propagating. The mouse is left alone, so drawing/dragging walls still works.
		const onKey = (e: KeyboardEvent, down: boolean) => {
			const target = e.target as HTMLElement | null
			if (target?.matches('input, textarea, [contenteditable="true"]')) return
			let handled = true
			switch (e.code) {
				case 'KeyW':
				case 'ArrowUp':
					input.forward = down
					break
				case 'KeyS':
				case 'ArrowDown':
					input.back = down
					break
				case 'KeyA':
					input.strafeLeft = down
					break
				case 'KeyD':
					input.strafeRight = down
					break
				case 'ArrowLeft':
					input.turnLeft = down
					break
				case 'ArrowRight':
					input.turnRight = down
					break
				default:
					handled = false
			}
			if (handled) {
				e.preventDefault()
				e.stopPropagation()
			}
		}
		const onKeyDown = (e: KeyboardEvent) => onKey(e, true)
		const onKeyUp = (e: KeyboardEvent) => onKey(e, false)
		window.addEventListener('keydown', onKeyDown, { capture: true })
		window.addEventListener('keyup', onKeyUp, { capture: true })

		return () => {
			editor.off('tick', onTick)
			window.removeEventListener('keydown', onKeyDown, { capture: true })
			window.removeEventListener('keyup', onKeyUp, { capture: true })
			const engineShapes = editor
				.getCurrentPageShapes()
				.filter((s) => s.meta?.rc)
				.map((s) => s.id)
			editor.run(() => editor.deleteShapes(engineShapes), { history: 'ignore' })
		}
	}, [editor])

	return null
}

export default function Engine3DExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<Engine />
			</Tldraw>
		</div>
	)
}

/*
This example renders a Doom-style first-person view using *only tldraw shapes* —
no canvas, no WebGL. Both ends of the pipeline are real shapes:

- The world (left): walls are ordinary shapes you draw — rectangles, ellipses,
  lines, even freehand strokes. The engine reads their outlines via
  editor.getShapeGeometry() + getShapePageTransform() and treats every edge as a
  wall segment (see readWalls). This runs every frame, so the moment you draw,
  drag, resize, recolour, or delete a shape, the 3D view updates in real time.

- The view (right): one geo rectangle per screen column. Each frame we cast a ray
  per column (engine.ts), then write each column's height and colour back into its
  rectangle with editor.updateShapes() inside editor.run(fn, { history: 'ignore' })
  so the 60-shapes-per-frame churn never touches the undo stack (see reconcile).

Walk with WASD, turn with the arrow keys. Engine-owned shapes are tagged with
meta.rc so readWalls can skip them; anything untagged is treated as a wall, which
is why drawing on the left instantly becomes something you can walk around.
*/
