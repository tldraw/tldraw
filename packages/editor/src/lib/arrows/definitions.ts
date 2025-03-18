import { ElbowArrowSide, VecModel } from '@tldraw/tlschema'

export const ElbowArrowSideDeltas = {
	top: { x: 0, y: -1 },
	right: { x: 1, y: 0 },
	bottom: { x: 0, y: 1 },
	left: { x: -1, y: 0 },
} as const satisfies Record<ElbowArrowSide, VecModel>
