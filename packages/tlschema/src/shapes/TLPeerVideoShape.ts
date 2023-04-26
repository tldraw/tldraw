import { defineMigrations } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { TLOpacityType } from '../style-types'
import { opacityValidator } from '../validation'
import { TLBaseShape, createShapeValidator } from './shape-validation'

/** @public */
export type TLPeerVideoShapeProps = {
	opacity: TLOpacityType
	w: number
	h: number
	userId?: string
}

/** @public */
export type TLPeerVideoShape = TLBaseShape<'peer-video', TLPeerVideoShapeProps>

// --- VALIDATION ---
/** @public */
export const peerVideoShapeTypeValidator: T.Validator<TLPeerVideoShape> = createShapeValidator(
	'peer-video',
	T.object({
		opacity: opacityValidator,
		w: T.nonZeroNumber,
		h: T.nonZeroNumber,
		userId: T.string.optional(),
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const peerVideoShapeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	firstVersion: Versions.Initial,
	currentVersion: Versions.Initial,
	migrators: {},
})
