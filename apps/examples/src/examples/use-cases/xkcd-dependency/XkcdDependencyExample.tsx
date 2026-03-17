import Matter from 'matter-js'
import { useEffect, useRef } from 'react'
import { createShapeId, Tldraw, TLShapeId, toRichText, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

// Block positions from the xkcd "Dependency" comic (#2347)
// Each group of 4 values is [x, y, width, height]
// y=0 is the bottom of the tower, y increases going up
// Source: https://editor.p5js.org/isohedral/sketches/vJa5RiZWs
const RAW_DATA = [
	0.5, 0.5, 217.113, 16.4414, 14.168, 16.9414, 181.059, 19.4141, 28.4297, 36.3555, 55.668, 10.6953,
	158.977, 36.3555, 7.921, 25.7539, 36.5547, 47.0508, 42.9844, 15.0586, 31.9961, 62.1094, 144.4099,
	8.7148, 23.2891, 70.8242, 159.1059, 48.2578, 15.918, 119.082, 83.4336, 106.715, 20.1875, 225.797,
	71.4023, 13.973, 102.844, 119.082, 85.371, 32.207, 102.844, 151.289, 89.254, 33.762, 24.9766,
	239.77, 14.6132, 19.457, 47.6055, 239.77, 11.7851, 13.562, 64.5781, 239.77, 27.0117, 20.636,
	66.4609, 260.406, 21.2149, 41.016, 69.2891, 301.422, 6.3672, 15.558, 79.4258, 301.422, 6.6015,
	25.457, 64.5781, 316.98, 12.4922, 4.95, 75.6563, 326.879, 13.4375, 9.43, 75.3047, 336.309, 6.3086,
	9.07, 84.3086, 336.309, 5.9609, 8.554, 52.375, 253.332, 5.2578, 15.426, 21.1602, 259.227, 27.3515,
	7.675, 20.1875, 266.902, 5.6094, 7.883, 28.5781, 266.902, 5.7188, 14.012, 38.7773, 266.902,
	4.6368, 10.2, 22.9922, 280.914, 17.332, 5.149, 27.1875, 286.063, 5.0938, 27.351, 27.1875, 313.414,
	4.4688, 10.82, 34.8359, 286.063, 9.3516, 10.355, 35.5313, 296.418, 7.8828, 7.879, 105.641,
	185.051, 13.078, 11.426, 104.254, 196.477, 4.359, 6.101, 109.813, 196.477, 4.96, 19.429, 106.434,
	215.906, 10.968, 6.231, 109.813, 222.137, 3.601, 6.617, 181.543, 185.051, 12.844, 19.719, 183.684,
	204.77, 5.754, 14.253, 179.27, 219.023, 15.117, 8.622, 180.207, 227.645, 4.547, 7.89, 189.438,
	227.645, 4.414, 6.421, 123.215, 185.051, 20.336, 52.625, 137.531, 237.676, 9.938, 11.238, 127.766,
	237.676, 8.16, 24.215, 152.379, 185.051, 23.414, 68.812, 156.125, 253.863, 14.383, 14.383,
	159.605, 268.246, 9.497, 10.367, 121.609, 261.891, 19.133, 16.722, 116.395, 278.613, 59.398,
	10.703, 166.961, 289.316, 12.309, 21.004, 170.508, 310.32, 5.285, 12.844, 113.414, 289.316,
	11.941, 10.5, 118.668, 299.816, 5.352, 13.715, 115.59, 313.531, 10.433, 6.555, 131.176, 289.316,
	30.703, 38.129, 130.305, 327.445, 14.582, 9.899, 150.641, 327.445, 14.984, 9.899, 137.598,
	337.344, 22.742, 9.765, 138.867, 347.109, 4.684, 14.18, 147.469, 347.109, 3.976, 10.301, 153.852,
	347.109, 4.949, 10.301,
]

const CANVAS_H = 434
const SCALE = 3

// The "critical dependency" block — a small block near the base of the tower
const DEPENDENCY_BLOCK_INDEX = 3

// tldraw colors to cycle through
const COLORS = [
	'light-blue',
	'light-green',
	'yellow',
	'orange',
	'light-red',
	'light-violet',
	'blue',
	'green',
	'red',
	'violet',
] as const

interface Block {
	x: number
	y: number
	w: number
	h: number
}

function processBlocks(): Block[] {
	const blocks: Block[] = []
	const scaled = RAW_DATA.map((v) => v * 1.07)
	for (let i = 0; i < scaled.length; i += 4) {
		const x = (scaled[i] + 20) * SCALE
		const y = (CANVAS_H - scaled[i + 1] - scaled[i + 3] - 20) * SCALE
		const w = scaled[i + 2] * SCALE
		const h = scaled[i + 3] * SCALE
		blocks.push({ x, y, w, h })
	}
	return blocks
}

function XkcdDependency() {
	const editor = useEditor()
	const engineRef = useRef<Matter.Engine | null>(null)
	const bodiesRef = useRef<{ id: TLShapeId; body: Matter.Body; w: number; h: number }[]>([])

	// Set up shapes and physics
	useEffect(() => {
		const blocks = processBlocks()
		const depBlock = blocks[DEPENDENCY_BLOCK_INDEX]

		// Create tldraw shapes for each block
		const shapes = blocks.map((block, i) => {
			const id = createShapeId(`xkcd-${i}`)
			return {
				id,
				type: 'geo' as const,
				x: block.x,
				y: block.y,
				props: {
					w: block.w,
					h: block.h,
					fill: 'solid' as const,
					color: i === DEPENDENCY_BLOCK_INDEX ? ('red' as const) : COLORS[i % COLORS.length],
					geo: 'rectangle' as const,
					size: 's' as const,
				},
			}
		})

		// Add a title text shape above the tower
		const titleId = createShapeId('xkcd-title')
		const minX = Math.min(...blocks.map((b) => b.x))
		const maxX = Math.max(...blocks.map((b) => b.x + b.w))
		const minY = Math.min(...blocks.map((b) => b.y))

		// Add annotation text and arrow pointing at the dependency block
		const annotationId = createShapeId('xkcd-annotation')
		const arrowId = createShapeId('xkcd-arrow')
		const depId = createShapeId(`xkcd-${DEPENDENCY_BLOCK_INDEX}`)
		const creditId = createShapeId('xkcd-credit')
		const groundY = blocks.reduce((max, b) => Math.max(max, b.y + b.h), 0) + 10

		editor.createShapes([
			...shapes,
			{
				id: titleId,
				type: 'text',
				x: minX + (maxX - minX) / 2 - 200,
				y: minY - 80,
				props: {
					richText: toRichText('All modern digital infrastructure'),
					size: 'l',
					color: 'black',
				},
			},
			{
				id: annotationId,
				type: 'text',
				x: depBlock.x - 320,
				y: depBlock.y + depBlock.h + 40,
				props: {
					richText: toRichText(
						'A project some random person in\nNebraska has been mass-maintaining\nsince 2003'
					),
					size: 's',
					color: 'black',
				},
			},
			{
				id: arrowId,
				type: 'arrow',
				x: depBlock.x - 30,
				y: depBlock.y + depBlock.h + 50,
				props: {
					start: { x: 0, y: 0 },
					end: { x: 30, y: -50 },
					color: 'black',
					size: 's',
					arrowheadStart: 'none',
					arrowheadEnd: 'arrow',
				},
			},
			{
				id: creditId,
				type: 'text',
				x: minX,
				y: groundY + 30,
				props: {
					richText: toRichText('With apologies to xkcd.com/2347\nInspired by p5js.org/isohedral'),
					size: 's',
					color: 'grey',
				},
			},
		])

		// Bind the arrow end to the dependency block
		editor.createBindings([
			{
				fromId: arrowId,
				toId: depId,
				type: 'arrow',
				props: {
					terminal: 'end',
					normalizedAnchor: { x: 0.5, y: 0.5 },
					isPrecise: false,
					isExact: false,
				},
			},
		])

		// Set up Matter.js physics engine
		const engine = Matter.Engine.create({ enableSleeping: true })
		engine.gravity.y = 1
		engineRef.current = engine

		// Create ground
		const ground = Matter.Bodies.rectangle(
			(minX + maxX) / 2,
			groundY + 50,
			(maxX - minX) * 3,
			100,
			{ isStatic: true }
		)
		Matter.Composite.add(engine.world, ground)

		// Track block IDs and dimensions (no physics bodies yet — created on demand)
		const blockMeta = blocks.map((block, i) => ({
			id: createShapeId(`xkcd-${i}`),
			w: block.w,
			h: block.h,
		}))
		const blockIdSet = new Set(blockMeta.map((b) => b.id as string))
		bodiesRef.current = []

		// Zoom to fit the tower
		editor.zoomToFit({ animation: { duration: 300 } })

		// Activate physics: read current shape positions and create dynamic bodies
		let physicsActive = false
		function activatePhysics(excludeId?: string) {
			if (physicsActive) return
			physicsActive = true

			const bodies: typeof bodiesRef.current = []
			for (const meta of blockMeta) {
				if (meta.id === excludeId) continue
				if (!blockIdSet.has(meta.id)) continue
				const shape = editor.getShape(meta.id)
				if (!shape) continue
				const body = Matter.Bodies.rectangle(
					shape.x + meta.w / 2,
					shape.y + meta.h / 2,
					meta.w,
					meta.h,
					{ restitution: 0.1, friction: 0.8, frictionStatic: 0.5 }
				)
				Matter.Composite.add(engine.world, body)
				bodies.push({ id: meta.id, body, w: meta.w, h: meta.h })
			}
			bodiesRef.current = bodies
		}

		// Flag to ignore store events triggered by the physics sync
		let updatingFromPhysics = false

		// Listen for user changes
		const removeListener = editor.store.listen(
			({ changes }) => {
				if (updatingFromPhysics) return
				const eng = engineRef.current
				if (!eng) return

				// Handle deletions — activate physics if not already, remove the body
				for (const key of Object.keys(changes.removed)) {
					if (!blockIdSet.has(key)) continue
					blockIdSet.delete(key)
					if (!physicsActive) {
						activatePhysics(key)
					} else {
						const idx = bodiesRef.current.findIndex((b) => b.id === key)
						if (idx !== -1) {
							Matter.Composite.remove(eng.world, bodiesRef.current[idx].body)
							bodiesRef.current.splice(idx, 1)
						}
					}
				}

				// Handle moves — activate physics if not already, sync position
				for (const [key, value] of Object.entries(changes.updated)) {
					if (!blockIdSet.has(key)) continue
					if (!physicsActive) {
						activatePhysics()
					}
					const shape = (value as [unknown, { x: number; y: number; rotation: number }])[1]
					const entry = bodiesRef.current.find((b) => b.id === key)
					if (!entry) continue
					Matter.Body.setPosition(entry.body, {
						x: shape.x + entry.w / 2,
						y: shape.y + entry.h / 2,
					})
					Matter.Body.setAngle(entry.body, shape.rotation)
					Matter.Body.setVelocity(entry.body, { x: 0, y: 0 })
				}
			},
			{ source: 'user', scope: 'document' }
		)

		// Physics tick — only runs once physics is activated
		function onTick() {
			if (!physicsActive) return
			const eng = engineRef.current
			if (!eng) return

			Matter.Engine.update(eng, 1000 / 60)

			const updates: { id: TLShapeId; type: 'geo'; x: number; y: number; rotation: number }[] = []
			for (const { id, body, w, h } of bodiesRef.current) {
				if (body.isSleeping) continue
				const bx = body.position.x - w / 2
				const by = body.position.y - h / 2
				if (!isFinite(bx) || !isFinite(by)) continue
				updates.push({ id, type: 'geo', x: bx, y: by, rotation: body.angle })
			}

			if (updates.length > 0) {
				updatingFromPhysics = true
				editor.updateShapes(updates)
				updatingFromPhysics = false
			}
		}

		editor.on('tick', onTick)

		return () => {
			editor.off('tick', onTick)
			removeListener()
			if (engineRef.current) {
				Matter.Engine.clear(engineRef.current)
				engineRef.current = null
			}
			// Clean up shapes so strict mode re-mount works
			const shapeIds: TLShapeId[] = blocks.map((_, i) => createShapeId(`xkcd-${i}`))
			shapeIds.push(titleId, annotationId, arrowId, creditId)
			editor.deleteShapes(shapeIds)
		}
	}, [editor])

	return null
}

export default function XkcdDependencyExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<XkcdDependency />
			</Tldraw>
		</div>
	)
}
