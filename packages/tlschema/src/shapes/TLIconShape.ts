import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLColorType, TLDashType, TLIconType, TLOpacityType, TLSizeType } from '../style-types'
import {
	colorValidator,
	dashValidator,
	iconValidator,
	opacityValidator,
	sizeValidator,
} from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLIconShapeProps = {
	size: TLSizeType
	icon: TLIconType
	dash: TLDashType
	color: TLColorType
	opacity: TLOpacityType
	scale: number
}

/** @public */
export type TLIconShape = TLBaseShape<'icon', TLIconShapeProps>

// --- VALIDATION ---
/** @public */
export const iconShapeTypeValidator: T.Validator<TLIconShape> = createShapeValidator(
	'icon',
	T.object({
		size: sizeValidator,
		icon: iconValidator,
		dash: dashValidator,
		color: colorValidator,
		opacity: opacityValidator,
		scale: T.number,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const iconShapeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	firstVersion: Versions.Initial,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
	},
})
