import { Mat, PI2, TLArrowShape, TLGeoShape, VecLike } from '@tldraw/editor'
import { defaultHandleExternalTextContent } from '../lib/defaultExternalContentHandlers'
import { getArrowInfo } from '../lib/shapes/arrow/getArrowInfo'
import { renderPlaintextFromRichText } from '../lib/utils/text/richText'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})

describe('mermaid external text import', () => {
	it('imports mermaid flowcharts as connected diagram shapes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart LR
				A[Start] --> B{Decision}
				B --> C[Done]
			`,
		})

		const shapes = editor.getCurrentPageShapes()
		const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(3)
		expect(arrows).toHaveLength(2)
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(0)

		for (const arrow of arrows) {
			const bindings = editor.getBindingsFromShape(arrow, 'arrow')
			expect(bindings.map((binding) => binding.props.terminal).sort()).toEqual(['end', 'start'])
			for (const binding of bindings) {
				expect(binding.props.normalizedAnchor.x).toBeGreaterThanOrEqual(0.1)
				expect(binding.props.normalizedAnchor.x).toBeLessThanOrEqual(0.9)
				expect(binding.props.normalizedAnchor.y).toBeGreaterThanOrEqual(0.1)
				expect(binding.props.normalizedAnchor.y).toBeLessThanOrEqual(0.9)
			}
		}
	})

	it('imports fenced mermaid code blocks', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `\`\`\`mermaid
flowchart TD
A --> B
\`\`\``,
		})

		const shapes = editor.getCurrentPageShapes()
		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(2)
		expect(shapes.filter((shape) => shape.type === 'arrow')).toHaveLength(1)
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(0)
	})

	it('falls back to plain text when parsing fails', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TDX
A --> B`,
		})

		const shapes = editor.getCurrentPageShapes()
		expect(shapes.filter((shape) => shape.type === 'text')).toHaveLength(1)
		expect(shapes.filter((shape) => shape.type === 'geo')).toHaveLength(0)
		expect(shapes.filter((shape) => shape.type === 'arrow')).toHaveLength(0)
	})

	it('renders subgraphs as containing geo shapes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TB
c1-->a2
subgraph one
  a1-->a2
end
subgraph two
  b1-->b2
end
one --> two`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const one = geoByLabel.get('one')
		const two = geoByLabel.get('two')
		const a1 = geoByLabel.get('a1')
		const b1 = geoByLabel.get('b1')
		const b2 = geoByLabel.get('b2')

		expect(one).toBeDefined()
		expect(two).toBeDefined()
		expect(a1).toBeDefined()
		expect(b1).toBeDefined()
		expect(b2).toBeDefined()

		expect(one!.props.dash).toBe('dashed')
		expect(one!.props.fill).toBe('none')
		expect(two!.props.dash).toBe('dashed')
		expect(two!.props.fill).toBe('none')

		// Mermaid container padding should leave generous space around child shapes.
		expect(a1!.x - one!.x).toBeGreaterThanOrEqual(48)
		expect(one!.x + one!.props.w - (a1!.x + a1!.props.w)).toBeGreaterThanOrEqual(48)
		expect(one!.y + one!.props.h - (a1!.y + a1!.props.h)).toBeGreaterThanOrEqual(40)

		expect(containsGeo(one!, a1!)).toBe(true)
		expect(containsGeo(two!, b1!)).toBe(true)
		expect(containsGeo(two!, b2!)).toBe(true)

		expect(one!.parentId).toBe(a1!.parentId)
		expect(two!.parentId).toBe(b1!.parentId)
		expect(two!.parentId).toBe(b2!.parentId)
		expect(one!.parentId).not.toBe(two!.parentId)
		expect(editor.getShape(one!.parentId!)?.type).toBe('group')
		expect(editor.getShape(two!.parentId!)?.type).toBe('group')
	})

	it('keeps nodes referenced in a subgraph line grouped with that subgraph', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TB
    c1-->a2
    subgraph one
    a1-->a2
    end
    subgraph two
    b1-->b2
    end
    subgraph three
    c1-->c2
    end`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const a1 = geoByLabel.get('a1')
		const a2 = geoByLabel.get('a2')
		const c1 = geoByLabel.get('c1')
		const c2 = geoByLabel.get('c2')
		const one = geoByLabel.get('one')
		const three = geoByLabel.get('three')

		expect(a1).toBeDefined()
		expect(a2).toBeDefined()
		expect(c1).toBeDefined()
		expect(c2).toBeDefined()
		expect(one).toBeDefined()
		expect(three).toBeDefined()

		expect(a1!.parentId).toBe(a2!.parentId)
		expect(c1!.parentId).toBe(c2!.parentId)
		expect(one!.parentId).toBe(a1!.parentId)
		expect(three!.parentId).toBe(c1!.parentId)
		expect(editor.getShape(one!.parentId!)?.type).toBe('group')
		expect(editor.getShape(three!.parentId!)?.type).toBe('group')
	})

	it('adds opposite bends for reverse-direction edges between the same nodes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
A --> B
B --> A`,
		})

		const arrows = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

		expect(arrows).toHaveLength(2)
		expect(arrows.every((arrow) => arrow.props.bend === 40)).toBe(true)
	})

	it('positions state bent arrow labels closer to the start of the arrow', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> Active
state Active {
  [*] --> NumLockOff
  NumLockOff --> NumLockOn : EvNumLockPressed
  NumLockOn --> NumLockOff : EvNumLockPressed
}`,
		})

		const arrows = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
		const labeledBentArrows = arrows.filter(
			(arrow) =>
				arrow.props.bend !== 0 &&
				renderPlaintextFromRichText(editor, arrow.props.richText).trim() === 'EvNumLockPressed'
		)

		expect(labeledBentArrows).toHaveLength(2)
		expect(labeledBentArrows.every((arrow) => arrow.props.labelPosition === 0.3)).toBe(true)
	})

	it('aligns state nodes in the same column and row by center', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
state if_state <<choice>>
[*] --> IsPositive
IsPositive --> if_state
if_state --> False: if n < 0
if_state --> True : if n >= 0`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const isPositive = geoByLabel.get('IsPositive')
		const choice = geoByLabel.get('if_state')
		const falseState = geoByLabel.get('False')
		const trueState = geoByLabel.get('True')

		expect(isPositive).toBeDefined()
		expect(choice).toBeDefined()
		expect(falseState).toBeDefined()
		expect(trueState).toBeDefined()

		const columnCenterX = getCenterX(choice!)
		expect(Math.abs(getCenterX(isPositive!) - columnCenterX)).toBeLessThan(1)
		expect(Math.abs(getCenterX(falseState!) - columnCenterX)).toBeLessThan(1)
		expect(Math.abs(getCenterY(falseState!) - getCenterY(trueState!))).toBeLessThan(1)
	})

	it('bends long state arrows that would cross through another node', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `stateDiagram-v2
[*] --> Still
Still --> [*]
Still --> Moving
Moving --> Still
Moving --> Crash
Crash --> [*]`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
		const terminalGeos = geoShapes.filter(
			(shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === ''
		)
		const rootEnd = terminalGeos.sort((a, b) => b.y - a.y)[0]

		expect(rootEnd).toBeDefined()

		const arrowsToRootEnd = arrows.filter((arrow) => {
			const endBinding = editor
				.getBindingsFromShape(arrow, 'arrow')
				.find((binding) => binding.props.terminal === 'end')
			return endBinding?.toId === rootEnd.id
		})

		expect(arrowsToRootEnd.length).toBeGreaterThan(0)

		const longestArrowToRootEnd = arrowsToRootEnd.sort(
			(a, b) => getArrowLength(b) - getArrowLength(a)
		)[0]
		expect(longestArrowToRootEnd.props.bend).not.toBe(0)

		const crash = geoShapes.find(
			(shape) => renderPlaintextFromRichText(editor, shape.props.richText).trim() === 'Crash'
		)
		expect(crash).toBeDefined()

		const crashBounds = editor.getShapePageBounds(crash!.id)!
		const crashInteriorRect = {
			x: crashBounds.x + 2,
			y: crashBounds.y + 2,
			w: Math.max(0, crashBounds.w - 4),
			h: Math.max(0, crashBounds.h - 4),
		}
		const points = getArrowPagePolyline(editor, longestArrowToRootEnd, 80)
		expect(polylineIntersectsRect(points, crashInteriorRect)).toBe(false)
	})

	it('increases bend on long flowchart back-links to avoid intermediate nodes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `flowchart TD
A[Start] --> B{Is it?}
B -->|Yes| C[OK]
C --> D[Rethink]
D --> B
B ---->|No| E[End]`,
		})

		const shapes = editor.getCurrentPageShapes()
		const geoShapes = shapes.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const arrows = shapes.filter((shape): shape is TLArrowShape => shape.type === 'arrow')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const rethink = geoByLabel.get('Rethink')
		const isIt = geoByLabel.get('Is it?')
		const ok = geoByLabel.get('OK')

		expect(rethink).toBeDefined()
		expect(isIt).toBeDefined()
		expect(ok).toBeDefined()

		const loopArrow = arrows.find((arrow) => {
			const bindings = editor.getBindingsFromShape(arrow, 'arrow')
			const startBinding = bindings.find((binding) => binding.props.terminal === 'start')
			const endBinding = bindings.find((binding) => binding.props.terminal === 'end')
			return startBinding?.toId === rethink!.id && endBinding?.toId === isIt!.id
		})

		expect(loopArrow).toBeDefined()

		const loopPoints = getArrowPagePolyline(editor, loopArrow!, 80)
		const okBounds = editor.getShapePageBounds(ok!.id)!
		const okInteriorRect = {
			x: okBounds.x + 2,
			y: okBounds.y + 2,
			w: Math.max(0, okBounds.w - 4),
			h: Math.max(0, okBounds.h - 4),
		}

		expect(polylineIntersectsRect(loopPoints, okInteriorRect)).toBe(false)
	})

	it('uses nearest-side anchors for mindmap edges between containing nodes', async () => {
		await defaultHandleExternalTextContent(editor, {
			text: `mindmap
	Project
		Design
			UI
			UX
		Build
			Frontend
			Backend`,
		})

		const geoShapes = editor
			.getCurrentPageShapes()
			.filter((shape): shape is TLGeoShape => shape.type === 'geo')
		const geoByLabel = new Map(
			geoShapes.map((shape) => [
				renderPlaintextFromRichText(editor, shape.props.richText).trim(),
				shape,
			])
		)

		const project = geoByLabel.get('Project')
		const design = geoByLabel.get('Design')
		const build = geoByLabel.get('Build')
		expect(project).toBeDefined()
		expect(design).toBeDefined()
		expect(build).toBeDefined()

		const projectToDesign = getArrowTerminalAnchors(editor, project!.id, design!.id)
		const projectToBuild = getArrowTerminalAnchors(editor, project!.id, build!.id)
		expect(projectToDesign).toBeDefined()
		expect(projectToBuild).toBeDefined()

		expect(projectToDesign!.start.x).toBe(projectToDesign!.end.x)
		expect(projectToBuild!.start.x).toBe(projectToBuild!.end.x)
	})

	it('routes self-edges on the right side and increases bend for labels', async () => {
		const plainEditor = new TestEditor()
		await defaultHandleExternalTextContent(plainEditor, {
			text: `flowchart TD
A --> A`,
		})

		const plainArrow = plainEditor
			.getCurrentPageShapes()
			.find((shape): shape is TLArrowShape => shape.type === 'arrow')
		expect(plainArrow).toBeDefined()

		const plainBindings = plainEditor.getBindingsFromShape(plainArrow!, 'arrow')
		const plainStart = plainBindings.find((binding) => binding.props.terminal === 'start')
		const plainEnd = plainBindings.find((binding) => binding.props.terminal === 'end')

		expect(plainStart).toBeDefined()
		expect(plainEnd).toBeDefined()
		expect(plainStart!.props.normalizedAnchor.x).toBe(0.9)
		expect(plainEnd!.props.normalizedAnchor.x).toBe(0.9)
		expect(plainStart!.props.normalizedAnchor.y).toBeLessThan(plainEnd!.props.normalizedAnchor.y)
		expect(plainArrow!.props.bend).toBeLessThan(-40)

		const labeledEditor = new TestEditor()
		await defaultHandleExternalTextContent(labeledEditor, {
			text: `flowchart TD
A -->|A very long self-edge label for spacing| A`,
		})

		const labeledArrow = labeledEditor
			.getCurrentPageShapes()
			.find((shape): shape is TLArrowShape => shape.type === 'arrow')
		expect(labeledArrow).toBeDefined()
		expect(Math.abs(labeledArrow!.props.bend)).toBeGreaterThan(Math.abs(plainArrow!.props.bend))
	})
})

function containsGeo(container: TLGeoShape, child: TLGeoShape) {
	return (
		container.x <= child.x &&
		container.y <= child.y &&
		container.x + container.props.w >= child.x + child.props.w &&
		container.y + container.props.h >= child.y + child.props.h
	)
}

function getCenterX(shape: TLGeoShape) {
	return shape.x + shape.props.w / 2
}

function getCenterY(shape: TLGeoShape) {
	return shape.y + shape.props.h / 2
}

function getArrowLength(shape: TLArrowShape) {
	const start = {
		x: shape.x + shape.props.start.x,
		y: shape.y + shape.props.start.y,
	}
	const end = {
		x: shape.x + shape.props.end.x,
		y: shape.y + shape.props.end.y,
	}
	return Math.hypot(end.x - start.x, end.y - start.y)
}

function getArrowTerminalAnchors(editor: TestEditor, sourceId: string, targetId: string) {
	const arrows = editor
		.getCurrentPageShapes()
		.filter((shape): shape is TLArrowShape => shape.type === 'arrow')

	for (const arrow of arrows) {
		const bindings = editor.getBindingsFromShape(arrow, 'arrow')
		const start = bindings.find((binding) => binding.props.terminal === 'start')
		const end = bindings.find((binding) => binding.props.terminal === 'end')
		if (start?.toId === sourceId && end?.toId === targetId) {
			return {
				start: start.props.normalizedAnchor,
				end: end.props.normalizedAnchor,
			}
		}
	}

	return null
}

function getArrowPagePolyline(editor: TestEditor, arrow: TLArrowShape, segments: number) {
	const info = getArrowInfo(editor, arrow)
	if (!info) return []

	const arrowTransform = editor.getShapePageTransform(arrow)!

	if (info.type === 'arc') {
		const startAngle = Math.atan2(
			info.start.point.y - info.bodyArc.center.y,
			info.start.point.x - info.bodyArc.center.x
		)
		const points: VecLike[] = []

		for (let i = 0; i <= segments; i++) {
			const t = i / segments
			const angle = normalizeAngle(startAngle + info.bodyArc.size * t)
			points.push(
				Mat.applyToPoint(arrowTransform, {
					x: info.bodyArc.center.x + Math.cos(angle) * info.bodyArc.radius,
					y: info.bodyArc.center.y + Math.sin(angle) * info.bodyArc.radius,
				})
			)
		}

		return points
	}

	if (info.type === 'elbow') {
		return info.route.points.map((point) => Mat.applyToPoint(arrowTransform, point))
	}

	return [
		Mat.applyToPoint(arrowTransform, info.start.point),
		Mat.applyToPoint(arrowTransform, info.end.point),
	]
}

function normalizeAngle(angle: number) {
	let next = angle
	while (next <= -Math.PI) next += PI2
	while (next > Math.PI) next -= PI2
	return next
}

function polylineIntersectsRect(
	points: VecLike[],
	rect: { x: number; y: number; w: number; h: number }
) {
	for (let i = 0; i < points.length - 1; i++) {
		if (segmentIntersectsRect(points[i], points[i + 1], rect)) return true
	}
	return false
}

function segmentIntersectsRect(
	a: VecLike,
	b: VecLike,
	rect: { x: number; y: number; w: number; h: number }
) {
	if (pointInRect(a, rect) || pointInRect(b, rect)) return true

	const topLeft = { x: rect.x, y: rect.y }
	const topRight = { x: rect.x + rect.w, y: rect.y }
	const bottomRight = { x: rect.x + rect.w, y: rect.y + rect.h }
	const bottomLeft = { x: rect.x, y: rect.y + rect.h }

	return (
		segmentsIntersect(a, b, topLeft, topRight) ||
		segmentsIntersect(a, b, topRight, bottomRight) ||
		segmentsIntersect(a, b, bottomRight, bottomLeft) ||
		segmentsIntersect(a, b, bottomLeft, topLeft)
	)
}

function pointInRect(point: VecLike, rect: { x: number; y: number; w: number; h: number }) {
	return (
		point.x >= rect.x &&
		point.x <= rect.x + rect.w &&
		point.y >= rect.y &&
		point.y <= rect.y + rect.h
	)
}

function segmentsIntersect(a: VecLike, b: VecLike, c: VecLike, d: VecLike) {
	const o1 = orientation(a, b, c)
	const o2 = orientation(a, b, d)
	const o3 = orientation(c, d, a)
	const o4 = orientation(c, d, b)

	if (o1 !== o2 && o3 !== o4) return true
	if (o1 === 0 && onSegment(a, c, b)) return true
	if (o2 === 0 && onSegment(a, d, b)) return true
	if (o3 === 0 && onSegment(c, a, d)) return true
	if (o4 === 0 && onSegment(c, b, d)) return true

	return false
}

function orientation(a: VecLike, b: VecLike, c: VecLike) {
	const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
	if (Math.abs(value) < 0.00001) return 0
	return value > 0 ? 1 : 2
}

function onSegment(a: VecLike, b: VecLike, c: VecLike) {
	return (
		b.x <= Math.max(a.x, c.x) &&
		b.x >= Math.min(a.x, c.x) &&
		b.y <= Math.max(a.y, c.y) &&
		b.y >= Math.min(a.y, c.y)
	)
}
