import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLOpacityType } from '../style-types'
import { opacityValidator } from '../validation'
import { createShapeValidator, TLBaseShape } from './shape-validation'

/** @public */
export type TLGroupShapeProps = {
	opacity: TLOpacityType
}

/** @public */
export type TLGroupShape = TLBaseShape<'group', TLGroupShapeProps>

// --- VALIDATION ---
/** @public */
export const groupShapeTypeValidator: T.Validator<TLGroupShape> = createShapeValidator(
	'group',
	T.object({
		opacity: opacityValidator,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const groupShapeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	firstVersion: Versions.Initial,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
	},
})
