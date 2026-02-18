import { TLArrowShapeArrowheadStyle, TLDefaultDashStyle, TLGeoShape } from 'tldraw'

export function mapEdgeTypeToArrowhead(type: string | undefined): TLArrowShapeArrowheadStyle {
	if (!type) return 'arrow'

	if (type.includes('point')) return 'arrow'
	if (type.includes('circle')) return 'dot'
	if (type.includes('cross')) return 'bar'
	if (type.includes('open')) return 'none'

	return 'arrow'
}

export function mapFlowShapeTypeToGeo(type: string | undefined): TLGeoShape['props']['geo'] {
	switch (type) {
		case 'diamond':
			return 'diamond'
		case 'ellipse':
		case 'circle':
		case 'doublecircle':
			return 'ellipse'
		case 'stadium':
		case 'cylinder':
			return 'oval'
		case 'hexagon':
			return 'hexagon'
		case 'trapezoid':
		// todo(guillaume) implement inv_trapezoid in sdk at some point, seems easy enough
		case 'inv_trapezoid':
			return 'trapezoid'
		case 'lean_right':
			return 'rhombus'
		case 'lean_left':
			return 'rhombus-2'
		case 'square':
		case 'rect':
		case 'round':
		case 'subroutine':
		default:
			return 'rectangle'
	}
}

export function mapEdgeStrokeToDash(stroke: string | undefined): TLDefaultDashStyle {
	if (!stroke) return 'solid'
	if (stroke === 'dotted') return 'dotted'
	return 'solid'
}

const CHAR_WIDTH = 16
const PADDING_X = 30
const LINE_HEIGHT = 28
const PADDING_Y = 40
const MIN_W = 100
const MAX_W = 300
export function estimateFlowNodeSize(
	type: string | undefined,
	label: string | undefined
): { w: number; h: number } {
	const textW = (label?.length || 0) * CHAR_WIDTH
	const w = Math.min(MAX_W, Math.max(MIN_W, textW + PADDING_X))
	let h = LINE_HEIGHT + PADDING_Y

	if (type === 'diamond') {
		h = w / 1.5
	}

	if (type === 'circle') {
		h = w / 2
	}

	return { w, h }
}

export function mapStateTypeToGeo(type: string): TLGeoShape['props']['geo'] {
	switch (type) {
		case 'choice':
			return 'diamond'
		case 'start':
		case 'end':
			return 'ellipse'
		default:
			return 'rectangle'
	}
}

export function mapStateTypeToSize(type: string): { w: number; h: number } {
	switch (type) {
		case 'start':
			return { w: 36, h: 36 }
		case 'end':
			return { w: 40, h: 40 }
		case 'fork':
		case 'join':
			return { w: 200, h: 8 }
		case 'choice':
			return { w: 100, h: 100 }
		case 'divider':
			return { w: 200, h: 4 }
		default:
			return { w: 200, h: 80 }
	}
}

// Sequence diagram line types (from SequenceDB.LINETYPE)
const SIGNAL_TYPES = new Set([0, 1, 3, 4, 5, 6, 24, 25, 33, 34])

export function isSignalMessage(type: number | undefined): boolean {
	return type !== undefined && SIGNAL_TYPES.has(type)
}

export function mapParticipantTypeToGeo(type: string): TLGeoShape['props']['geo'] {
	switch (type) {
		case 'actor':
			return 'ellipse'
		case 'database':
			return 'oval'
		default:
			return 'rectangle'
	}
}

export function mapLineTypeToArrowProps(type: number): {
	dash: TLDefaultDashStyle
	arrowheadEnd: TLArrowShapeArrowheadStyle
} {
	switch (type) {
		case 0: // SOLID
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case 1: // DOTTED
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case 3: // SOLID_CROSS
			return { dash: 'solid', arrowheadEnd: 'bar' }
		case 4: // DOTTED_CROSS
			return { dash: 'dotted', arrowheadEnd: 'bar' }
		case 5: // SOLID_OPEN
			return { dash: 'solid', arrowheadEnd: 'none' }
		case 6: // DOTTED_OPEN
			return { dash: 'dotted', arrowheadEnd: 'none' }
		case 24: // SOLID_POINT
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case 25: // DOTTED_POINT
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		case 33: // BIDIRECTIONAL_SOLID
			return { dash: 'solid', arrowheadEnd: 'arrow' }
		case 34: // BIDIRECTIONAL_DOTTED
			return { dash: 'dotted', arrowheadEnd: 'arrow' }
		default:
			return { dash: 'solid', arrowheadEnd: 'arrow' }
	}
}

export function isBidirectional(type: number): boolean {
	return type === 33 || type === 34
}
