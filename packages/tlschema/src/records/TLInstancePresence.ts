import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { Box2dModel } from '../geometry-types'
import { cursorTypeValidator, scribbleTypeValidator, TLCursor, TLScribble } from '../ui-types'
import { idValidator, userIdValidator } from '../validation'
import { TLInstanceId } from './TLInstance'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'
import { TLUserId } from './TLUser'

/** @public */
export interface TLInstancePresence extends BaseRecord<'instance_presence'> {
	instanceId: TLInstanceId
	userId: TLUserId
	userName: string
	lastActivityTimestamp: number
	color: string // can be any hex color
	camera: { x: number; y: number; z: number }
	selectedIds: TLShapeId[]
	currentPageId: TLPageId
	brush: Box2dModel | null
	scribble: TLScribble | null
	screenBounds: Box2dModel
	followingUserId: TLUserId | null
	cursor: {
		x: number
		y: number
		type: TLCursor['type']
		rotation: number
	}
}

/** @public */
export type TLInstancePresenceID = ID<TLInstancePresence>

// --- VALIDATION ---
/** @public */
export const instancePresenceTypeValidator: T.Validator<TLInstancePresence> = T.model(
	'instance_presence',
	T.object({
		instanceId: idValidator<TLInstanceId>('instance'),
		typeName: T.literal('instance_presence'),
		id: idValidator<TLInstancePresenceID>('instance_presence'),
		userId: userIdValidator,
		userName: T.string,
		lastActivityTimestamp: T.number,
		followingUserId: userIdValidator.nullable(),
		cursor: T.object({
			x: T.number,
			y: T.number,
			type: cursorTypeValidator,
			rotation: T.number,
		}),
		color: T.string,
		camera: T.object({
			x: T.number,
			y: T.number,
			z: T.number,
		}),
		screenBounds: T.boxModel,
		selectedIds: T.arrayOf(idValidator<TLShapeId>('shape')),
		currentPageId: idValidator<TLPageId>('page'),
		brush: T.boxModel.nullable(),
		scribble: scribbleTypeValidator.nullable(),
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
} as const

/** @public */
export const userPresenceTypeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.Initial,
	firstVersion: Versions.Initial,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
	},
})

/** @public */
export const TLInstancePresence = createRecordType<TLInstancePresence>('instance_presence', {
	migrations: userPresenceTypeMigrations,
	validator: instancePresenceTypeValidator,
	scope: 'presence',
})
