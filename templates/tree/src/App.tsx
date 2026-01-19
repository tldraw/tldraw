import { useEffect, useRef } from 'react'
import { Editor, TLShapeId, Tldraw, b64Vecs, createShapeId, useEditor } from 'tldraw'
import 'tldraw/tldraw.css'

const BRANCH_LENGTH = 90
const BRANCH_SHRINK = 0.72
const MAX_DEPTH = 8

interface Branch {
	x1: number
	y1: number
	x2: number
	y2: number
	angle: number
	depth: number
}

function generateTree(startX: number, startY: number): Branch[] {
	const branches: Branch[] = []

	function grow(x: number, y: number, angle: number, length: number, depth: number) {
		if (depth > MAX_DEPTH) return
		if (length < 3) return

		// More randomness in the endpoint
		const wobbleX = (Math.random() - 0.5) * 8
		const wobbleY = (Math.random() - 0.5) * 8
		const x2 = x + Math.cos(angle) * length + wobbleX
		const y2 = y + Math.sin(angle) * length + wobbleY

		branches.push({ x1: x, y1: y, x2, y2, angle, depth })

		// Much more variance - less uniform
		const angleVariance1 = (Math.random() - 0.5) * 1.2
		const angleVariance2 = (Math.random() - 0.5) * 1.2
		const lengthVariance1 = 0.5 + Math.random() * 0.7
		const lengthVariance2 = 0.5 + Math.random() * 0.7

		// Random base angle for each branch
		const baseAngle1 = Math.PI / 6 + (Math.random() * Math.PI) / 6
		const baseAngle2 = Math.PI / 6 + (Math.random() * Math.PI) / 6

		// Sometimes skip a branch for asymmetry
		if (Math.random() > 0.15) {
			grow(
				x2,
				y2,
				angle - baseAngle1 + angleVariance1,
				length * BRANCH_SHRINK * lengthVariance1,
				depth + 1
			)
		}
		if (Math.random() > 0.15) {
			grow(
				x2,
				y2,
				angle + baseAngle2 + angleVariance2,
				length * BRANCH_SHRINK * lengthVariance2,
				depth + 1
			)
		}
		// Occasionally add a third branch
		if (Math.random() > 0.85) {
			const angleVariance3 = (Math.random() - 0.5) * 0.8
			grow(x2, y2, angle + angleVariance3, length * BRANCH_SHRINK * 0.8, depth + 1)
		}
	}

	grow(startX, startY, -Math.PI / 2, BRANCH_LENGTH, 0)

	return branches
}

function branchToFreehandPoints(branch: Branch): { x: number; y: number; z: number }[] {
	const points: { x: number; y: number; z: number }[] = []
	const segments = 12

	for (let i = 0; i <= segments; i++) {
		const t = i / segments
		// More organic wobble
		const wobbleAmount = (3 - branch.depth * 0.3) * (1 + Math.random() * 0.5)
		const wobble = Math.sin(t * Math.PI * (2 + Math.random())) * wobbleAmount
		const perpX = -Math.sin(branch.angle) * wobble
		const perpY = Math.cos(branch.angle) * wobble

		points.push({
			x: branch.x1 + (branch.x2 - branch.x1) * t + perpX + (Math.random() - 0.5) * 2,
			y: branch.y1 + (branch.y2 - branch.y1) * t + perpY + (Math.random() - 0.5) * 2,
			z: 0.5,
		})
	}

	return points
}

async function drawTree(editor: Editor, buttonX: number, buttonY: number) {
	const branches = generateTree(buttonX, buttonY)

	// Sort by depth so trunk draws first
	branches.sort((a, b) => a.depth - b.depth)

	for (const branch of branches) {
		const points = branchToFreehandPoints(branch)

		const minX = Math.min(...points.map((p) => p.x))
		const minY = Math.min(...points.map((p) => p.y))

		const normalizedPoints = points.map((p) => ({
			x: p.x - minX,
			y: p.y - minY,
			z: p.z,
		}))

		const shapeId = createShapeId()

		const size = 'm'
		const color = branch.depth < 3 ? 'grey' : branch.depth < 5 ? 'green' : 'light-green'

		editor.createShape({
			id: shapeId,
			type: 'draw',
			x: minX,
			y: minY,
			props: {
				segments: [{ type: 'free', points: b64Vecs.encodePoints(normalizedPoints) }],
				color,
				size,
				isClosed: false,
				isComplete: true,
			},
		})

		// Much slower - varied delay
		await new Promise((r) => setTimeout(r, 80 + Math.random() * 60))
	}
}

const OUTER_RADIUS = 40
const INNER_RADIUS = 25

function createButtonCircles(editor: Editor): {
	outerId: TLShapeId
	innerId: TLShapeId
	centerX: number
	centerY: number
} {
	const viewportBounds = editor.getViewportScreenBounds()
	const center = editor.screenToPage({
		x: viewportBounds.x + viewportBounds.w / 2,
		y: viewportBounds.y + viewportBounds.h / 2 + 150,
	})

	const outerId = createShapeId()
	const innerId = createShapeId()

	// Outer circle - unfilled, locked (no pointer events)
	editor.createShape({
		id: outerId,
		type: 'geo',
		x: center.x - OUTER_RADIUS,
		y: center.y - OUTER_RADIUS,
		isLocked: true,
		props: {
			geo: 'ellipse',
			w: OUTER_RADIUS * 2,
			h: OUTER_RADIUS * 2,
			color: 'grey',
			fill: 'none',
			size: 'm',
		},
	})

	// Inner circle - filled, clickable
	editor.createShape({
		id: innerId,
		type: 'geo',
		x: center.x - INNER_RADIUS,
		y: center.y - INNER_RADIUS,
		props: {
			geo: 'ellipse',
			w: INNER_RADIUS * 2,
			h: INNER_RADIUS * 2,
			color: 'grey',
			fill: 'solid',
			size: 'm',
		},
	})

	return { outerId, innerId, centerX: center.x, centerY: center.y }
}

function TreeButton() {
	const editor = useEditor()
	const buttonRef = useRef<{
		outerId: TLShapeId
		innerId: TLShapeId
		centerX: number
		centerY: number
	} | null>(null)
	const growingRef = useRef(false)

	useEffect(() => {
		// Create button circles on mount
		buttonRef.current = createButtonCircles(editor)

		// Prevent selection of inner button (outer is already locked)
		const cleanup = editor.sideEffects.registerBeforeChangeHandler(
			'instance_page_state',
			(_, next) => {
				const innerId = buttonRef.current?.innerId
				if (innerId && next.selectedShapeIds.includes(innerId)) {
					return { ...next, selectedShapeIds: next.selectedShapeIds.filter((id) => id !== innerId) }
				}
				return next
			}
		)

		const handleEvent = (info: { name: string }) => {
			if (info.name !== 'pointer_up') return
			if (growingRef.current) return
			if (!buttonRef.current) return

			const { innerId, centerX, centerY } = buttonRef.current

			// Check if we clicked on the inner button
			const pagePoint = editor.inputs.currentPagePoint
			const shapesAtPoint = editor.getShapesAtPoint(pagePoint)
			const clickedButton = shapesAtPoint.some((s) => s.id === innerId)

			if (clickedButton) {
				growingRef.current = true
				drawTree(editor, centerX, centerY - OUTER_RADIUS).then(() => {
					growingRef.current = false
				})
			}
		}

		editor.on('event', handleEvent)

		return () => {
			cleanup()
			editor.off('event', handleEvent)
		}
	}, [editor])

	return null
}

function App() {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw>
				<TreeButton />
			</Tldraw>
		</div>
	)
}

export default App
