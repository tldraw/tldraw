import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { Box2dModel, Vec2dModel } from '../geometry-types'
import { idValidator, instanceIdValidator, userIdValidator } from '../validation'
import { TLInstanceId } from './TLInstance'
import { TLUserId } from './TLUser'

/** @public */
export interface TLUserPresence extends BaseRecord<'user_presence'> {
	userId: TLUserId
	lastUsedInstanceId: TLInstanceId | null
	lastActivityTimestamp: number
	cursor: Vec2dModel
	viewportPageBounds: Box2dModel
	color: string // can be any hex color
}

/** @public */
export type TLUserPresenceId = ID<TLUserPresence>

// --- VALIDATION ---
/** @public */
export const userPresenceTypeValidator: T.Validator<TLUserPresence> = T.model(
	'user_presence',
	T.object({
		typeName: T.literal('user_presence'),
		id: idValidator<TLUserPresenceId>('user_presence'),
		userId: userIdValidator,
		lastUsedInstanceId: instanceIdValidator.nullable(),
		lastActivityTimestamp: T.number,
		cursor: T.point,
		viewportPageBounds: T.boxModel,
		color: T.string,
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
	AddViewportPageBounds: 1,
} as const

/** @public */
export const userPresenceTypeMigrations = defineMigrations({
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.AddViewportPageBounds,
	firstVersion: Versions.Initial,
	migrators: {
		// STEP 3: Add an up+down migration for the new version here
		[Versions.AddViewportPageBounds]: {
			up: (record) => {
				return {
					...record,
					viewportPageBounds: { x: 0, y: 0, w: 1, h: 1 },
				}
			},
			down: ({ viewportPageBounds: _viewportPageBounds, ...rest }) => rest,
		},
	},
})

/** @public */
export const TLUserPresence = createRecordType<TLUserPresence>('user_presence', {
	migrations: userPresenceTypeMigrations,
	validator: userPresenceTypeValidator,
}).withDefaultProperties(
	(): Omit<TLUserPresence, 'id' | 'typeName' | 'userId'> => ({
		lastUsedInstanceId: null,
		lastActivityTimestamp: 0,
		cursor: { x: 0, y: 0 },
		viewportPageBounds: { x: 0, y: 0, w: 1, h: 1 },
		color: '#000000',
	})
)
