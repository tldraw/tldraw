import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLColorType, TLOpacityType, TLSizeType } from '../style-types'
import { colorValidator, opacityValidator, sizeValidator } from '../validation'
import { TLDrawShapeSegment, drawShapeSegmentValidator } from './TLDrawShape'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLHighlightShapeProps = {
	color: TLColorType
	size: TLSizeType
	opacity: TLOpacityType
	segments: TLDrawShapeSegment[]
	isComplete: boolean
	isPen: boolean
}

/** @public */
export type TLHighlightShape = TLBaseShape<'highlight', TLHighlightShapeProps>

// --- VALIDATION ---
/** @public */
export const highlightShapeTypeValidator: T.Validator<TLHighlightShape> = createShapeValidator(
	'highlight',
	T.object({
		color: colorValidator,
		size: sizeValidator,
		opacity: opacityValidator,
		segments: T.arrayOf(drawShapeSegmentValidator),
		isComplete: T.boolean,
		isPen: T.boolean,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const highlightShapeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	firstVersion: Versions.Initial,
	currentVersion: Versions.Initial,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
	},
})
