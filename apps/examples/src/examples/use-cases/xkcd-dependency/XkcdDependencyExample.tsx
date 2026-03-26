import RAPIER from '@dimforge/rapier2d-compat'
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
	const worldRef = useRef<RAPIER.World | null>(null)
	const bodiesRef = useRef<{ id: TLShapeId; body: RAPIER.RigidBody; w: number; h: number }[]>([])

	useEffect(() => {
		let cancelled = false
		let onTick: (() => void) | null = null
		let removeListener: (() => void) | null = null

		const blocks = processBlocks()
		const depBlock = blocks[DEPENDENCY_BLOCK_INDEX]

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

		const titleId = createShapeId('xkcd-title')
		const minX = Math.min(...blocks.map((b) => b.x))
		const maxX = Math.max(...blocks.map((b) => b.x + b.w))
		const minY = Math.min(...blocks.map((b) => b.y))

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
					richText: {
						type: 'doc',
						content: [
							{
								type: 'paragraph',
								content: [
									{ type: 'text', text: 'With apologies to ' },
									{
										type: 'text',
										text: 'xkcd.com/2347',
										marks: [{ type: 'link', attrs: { href: 'https://xkcd.com/2347' } }],
									},
								],
							},
							{
								type: 'paragraph',
								content: [
									{ type: 'text', text: 'Inspired by ' },
									{
										type: 'text',
										text: 'editor.p5js.org/isohedral',
										marks: [
											{
												type: 'link',
												attrs: {
													href: 'https://editor.p5js.org/isohedral/full/vJa5RiZWs',
												},
											},
										],
									},
								],
							},
						],
					},
					size: 's',
					color: 'grey',
				},
			},
		])

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

		editor.zoomToFit({ animation: { duration: 300 } })

		RAPIER.init().then(() => {
			if (cancelled) return

			const world = new RAPIER.World({ x: 0, y: 200 })
			worldRef.current = world

			// Static ground body below the tower
			const groundBody = world.createRigidBody(
				RAPIER.RigidBodyDesc.fixed().setTranslation((minX + maxX) / 2, groundY + 50)
			)
			world.createCollider(RAPIER.ColliderDesc.cuboid(((maxX - minX) * 3) / 2, 50), groundBody)

			// Dynamic bodies for each block
			const blockIdSet = new Set<string>()
			const bodies: typeof bodiesRef.current = []
			for (let i = 0; i < blocks.length; i++) {
				const block = blocks[i]
				const id = createShapeId(`xkcd-${i}`)
				blockIdSet.add(id)
				const body = world.createRigidBody(
					RAPIER.RigidBodyDesc.dynamic()
						.setTranslation(block.x + block.w / 2, block.y + block.h / 2)
						.setCanSleep(true)
				)
				world.createCollider(
					RAPIER.ColliderDesc.cuboid(block.w / 2, block.h / 2)
						.setRestitution(0.05)
						.setFriction(0.1),
					body
				)
				bodies.push({ id, body, w: block.w, h: block.h })
			}
			bodiesRef.current = bodies

			// Warm up: settle any overlaps from the initial layout, then sleep everything
			for (let i = 0; i < 120; i++) world.step()
			const settled: { id: TLShapeId; type: 'geo'; x: number; y: number; rotation: number }[] = []
			for (const { id, body, w, h } of bodies) {
				const pos = body.translation()
				settled.push({
					id,
					type: 'geo',
					x: pos.x - w / 2,
					y: pos.y - h / 2,
					rotation: body.rotation(),
				})
				body.sleep()
			}
			editor.updateShapes(settled)

			let updatingFromPhysics = false
			const kinematicIds = new Set<string>()

			// Only handle deletions — drag syncing is done in the tick handler
			removeListener = editor.store.listen(
				({ changes }) => {
					if (updatingFromPhysics) return

					for (const key of Object.keys(changes.removed)) {
						if (!blockIdSet.has(key)) continue
						blockIdSet.delete(key)
						kinematicIds.delete(key)
						const idx = bodiesRef.current.findIndex((b) => b.id === key)
						if (idx !== -1) {
							world.removeRigidBody(bodiesRef.current[idx].body)
							bodiesRef.current.splice(idx, 1)
						}
						for (const { body } of bodiesRef.current) body.wakeUp()
					}
				},
				{ source: 'user', scope: 'document' }
			)

			onTick = () => {
				if (!worldRef.current) return

				const selectedIds = new Set(editor.getSelectedShapeIds() as string[])

				// Release bodies that are no longer selected back to dynamic
				for (const id of kinematicIds) {
					if (selectedIds.has(id)) continue
					kinematicIds.delete(id)
					const entry = bodiesRef.current.find((b) => b.id === id)
					if (!entry) continue
					entry.body.setBodyType(RAPIER.RigidBodyType.Dynamic, true)
					entry.body.setLinvel({ x: 0, y: 0 }, true)
					entry.body.setAngvel(0, true)
					for (const { body } of bodiesRef.current) body.wakeUp()
				}

				// Switch selected bodies to kinematic so they follow the user's drag
				for (const entry of bodiesRef.current) {
					if (!selectedIds.has(entry.id as string)) continue
					if (!kinematicIds.has(entry.id as string)) {
						entry.body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true)
						kinematicIds.add(entry.id as string)
					}
					const shape = editor.getShape(entry.id)
					if (!shape) continue
					entry.body.setNextKinematicTranslation({
						x: shape.x + entry.w / 2,
						y: shape.y + entry.h / 2,
					})
					entry.body.setNextKinematicRotation(shape.rotation)
				}

				world.step()

				// Sync non-selected, non-sleeping bodies back to tldraw shapes
				const updates: {
					id: TLShapeId
					type: 'geo'
					x: number
					y: number
					rotation: number
				}[] = []
				for (const { id, body, w, h } of bodiesRef.current) {
					if (kinematicIds.has(id as string)) continue
					if (body.isSleeping()) continue
					const pos = body.translation()
					const bx = pos.x - w / 2
					const by = pos.y - h / 2
					if (!isFinite(bx) || !isFinite(by)) continue
					updates.push({ id, type: 'geo', x: bx, y: by, rotation: body.rotation() })
				}

				if (updates.length > 0) {
					updatingFromPhysics = true
					editor.updateShapes(updates)
					updatingFromPhysics = false
				}
			}

			editor.on('tick', onTick)
		})

		return () => {
			cancelled = true
			if (onTick) editor.off('tick', onTick)
			if (removeListener) removeListener()
			if (worldRef.current) {
				worldRef.current.free()
				worldRef.current = null
			}
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
