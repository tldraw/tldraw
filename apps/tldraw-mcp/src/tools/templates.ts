/** Template layouts — predefined diagram skeletons the LLM can use as starting points. */

import { FocusedShape } from '../focused-shape.js'

type TemplateGenerator = (labels: string[]) => FocusedShape[]

const BOX_W = 200
const BOX_H = 100
const GAP_H = 100
const GAP_V = 80

/** Left-to-right flowchart. */
function flowchartLR(labels: string[]): FocusedShape[] {
	const shapes: FocusedShape[] = []
	const colors = ['blue', 'green', 'orange', 'violet', 'red', 'light-blue'] as const
	for (let i = 0; i < labels.length; i++) {
		const x = i * (BOX_W + GAP_H)
		shapes.push({
			_type: 'rectangle',
			shapeId: `node${i}`,
			x,
			y: 0,
			w: BOX_W,
			h: BOX_H,
			color: colors[i % colors.length],
			fill: 'tint',
			text: labels[i],
		})
		if (i > 0) {
			const prevX = (i - 1) * (BOX_W + GAP_H) + BOX_W
			shapes.push({
				_type: 'arrow',
				shapeId: `arrow${i - 1}`,
				x1: prevX,
				y1: BOX_H / 2,
				x2: x,
				y2: BOX_H / 2,
				color: 'black',
				fromId: `node${i - 1}`,
				toId: `node${i}`,
			})
		}
	}
	return shapes
}

/** Top-to-bottom flowchart. */
function flowchartTB(labels: string[]): FocusedShape[] {
	const shapes: FocusedShape[] = []
	const colors = ['blue', 'green', 'orange', 'violet', 'red', 'light-blue'] as const
	for (let i = 0; i < labels.length; i++) {
		const y = i * (BOX_H + GAP_V)
		shapes.push({
			_type: 'rectangle',
			shapeId: `node${i}`,
			x: 0,
			y,
			w: BOX_W,
			h: BOX_H,
			color: colors[i % colors.length],
			fill: 'tint',
			text: labels[i],
		})
		if (i > 0) {
			const prevY = (i - 1) * (BOX_H + GAP_V) + BOX_H
			shapes.push({
				_type: 'arrow',
				shapeId: `arrow${i - 1}`,
				x1: BOX_W / 2,
				y1: prevY,
				x2: BOX_W / 2,
				y2: y,
				color: 'black',
				fromId: `node${i - 1}`,
				toId: `node${i}`,
			})
		}
	}
	return shapes
}

/** Org chart — tree structure. First label is root, rest are children. */
function orgChart(labels: string[]): FocusedShape[] {
	if (labels.length === 0) return []
	const shapes: FocusedShape[] = []

	// Root
	const childCount = labels.length - 1
	const totalChildWidth = childCount * BOX_W + Math.max(0, childCount - 1) * GAP_H
	const rootX = (totalChildWidth - BOX_W) / 2

	shapes.push({
		_type: 'rectangle',
		shapeId: 'root',
		x: Math.max(0, rootX),
		y: 0,
		w: BOX_W,
		h: BOX_H,
		color: 'blue',
		fill: 'tint',
		text: labels[0],
	})

	// Children
	for (let i = 1; i < labels.length; i++) {
		const childX = (i - 1) * (BOX_W + GAP_H)
		const childY = BOX_H + GAP_V + 20
		shapes.push({
			_type: 'rectangle',
			shapeId: `child${i}`,
			x: childX,
			y: childY,
			w: BOX_W,
			h: BOX_H,
			color: 'green',
			fill: 'tint',
			text: labels[i],
		})
		shapes.push({
			_type: 'arrow',
			shapeId: `arrow${i}`,
			x1: Math.max(0, rootX) + BOX_W / 2,
			y1: BOX_H,
			x2: childX + BOX_W / 2,
			y2: childY,
			color: 'black',
			fromId: 'root',
			toId: `child${i}`,
		})
	}
	return shapes
}

/** Architecture — layered boxes with connections between adjacent layers. */
function architecture(labels: string[]): FocusedShape[] {
	const shapes: FocusedShape[] = []
	const colors = ['blue', 'green', 'orange', 'violet', 'red'] as const
	const LAYER_GAP = 150

	for (let i = 0; i < labels.length; i++) {
		const x = i * (BOX_W + LAYER_GAP)
		shapes.push({
			_type: 'rectangle',
			shapeId: `layer${i}`,
			x,
			y: 0,
			w: BOX_W,
			h: BOX_H,
			color: colors[i % colors.length],
			fill: 'tint',
			text: labels[i],
		})
		if (i > 0) {
			const prevX = (i - 1) * (BOX_W + LAYER_GAP) + BOX_W
			shapes.push({
				_type: 'arrow',
				shapeId: `conn${i - 1}`,
				x1: prevX,
				y1: BOX_H / 2,
				x2: x,
				y2: BOX_H / 2,
				color: 'black',
				fromId: `layer${i - 1}`,
				toId: `layer${i}`,
			})
		}
	}
	return shapes
}

/** Mind map — central node with radial branches. */
function mindMap(labels: string[]): FocusedShape[] {
	if (labels.length === 0) return []
	const shapes: FocusedShape[] = []
	const colors = ['green', 'orange', 'violet', 'light-blue', 'light-red', 'yellow'] as const

	// Center node
	const cx = 400
	const cy = 300
	shapes.push({
		_type: 'ellipse',
		shapeId: 'center',
		x: cx - BOX_W / 2,
		y: cy - BOX_H / 2,
		w: BOX_W,
		h: BOX_H,
		color: 'blue',
		fill: 'tint',
		text: labels[0],
	})

	// Branch nodes arranged in a circle
	const branchCount = labels.length - 1
	const radius = 250
	for (let i = 0; i < branchCount; i++) {
		const angle = (2 * Math.PI * i) / branchCount - Math.PI / 2
		const bx = cx + radius * Math.cos(angle)
		const by = cy + radius * Math.sin(angle)
		shapes.push({
			_type: 'rectangle',
			shapeId: `branch${i}`,
			x: bx - BOX_W / 2,
			y: by - BOX_H / 2,
			w: BOX_W,
			h: BOX_H,
			color: colors[i % colors.length],
			fill: 'tint',
			text: labels[i + 1],
		})
		shapes.push({
			_type: 'arrow',
			shapeId: `link${i}`,
			x1: cx,
			y1: cy,
			x2: bx,
			y2: by,
			color: 'grey',
			fromId: 'center',
			toId: `branch${i}`,
		})
	}
	return shapes
}

/** Sequence — vertical timeline with labeled arrows between actors. */
function sequence(labels: string[]): FocusedShape[] {
	if (labels.length < 2) return flowchartTB(labels)
	const shapes: FocusedShape[] = []

	// Create actor boxes at the top
	for (let i = 0; i < labels.length; i++) {
		shapes.push({
			_type: 'rectangle',
			shapeId: `actor${i}`,
			x: i * (BOX_W + GAP_H),
			y: 0,
			w: BOX_W,
			h: 60,
			color: 'blue',
			fill: 'tint',
			text: labels[i],
		})
		// Lifeline
		shapes.push({
			_type: 'line',
			shapeId: `lifeline${i}`,
			x1: i * (BOX_W + GAP_H) + BOX_W / 2,
			y1: 60,
			x2: i * (BOX_W + GAP_H) + BOX_W / 2,
			y2: 60 + (labels.length - 1) * 80,
			color: 'grey',
			dash: 'dashed',
		})
	}

	// Arrows between adjacent actors going down the timeline
	for (let i = 0; i < labels.length - 1; i++) {
		const y = 80 + i * 80
		const fromX = i * (BOX_W + GAP_H) + BOX_W / 2
		const toX = (i + 1) * (BOX_W + GAP_H) + BOX_W / 2
		shapes.push({
			_type: 'arrow',
			shapeId: `msg${i}`,
			x1: fromX,
			y1: y,
			x2: toX,
			y2: y,
			color: 'black',
			text: `Step ${i + 1}`,
		})
	}
	return shapes
}

export const TEMPLATES: Record<string, TemplateGenerator> = {
	'flowchart-lr': flowchartLR,
	'flowchart-tb': flowchartTB,
	'org-chart': orgChart,
	'architecture': architecture,
	'mind-map': mindMap,
	'sequence': sequence,
}

export const TEMPLATE_NAMES = Object.keys(TEMPLATES) as [string, ...string[]]
