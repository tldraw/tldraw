import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { Box2dModel, Vec2dModel } from '../geometry-types'
import { TLInstanceId } from './TLInstance'
import { TLUserId } from './TLUser'

/** @public */
export interface TLUserPresence extends BaseRecord<'user_presence', TLUserPresenceId> {
	userId: TLUserId
	lastUsedInstanceId: TLInstanceId | null
	lastActivityTimestamp: number
	cursor: Vec2dModel
	viewportPageBounds: Box2dModel
	color: string // can be any hex color
}

/** @public */
export type TLUserPresenceId = ID<TLUserPresence>

const Versions = {
	AddViewportPageBounds: 1,
} as const

/** @public */
export const userPresenceTypeMigrator = new Migrator({
	currentVersion: Versions.AddViewportPageBounds,
	migrators: {
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
export const UserPresenceRecordType = createRecordType<TLUserPresence>('user_presence', {
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLUserPresence, 'id' | 'typeName' | 'userId'> => ({
		lastUsedInstanceId: null,
		lastActivityTimestamp: 0,
		cursor: { x: 0, y: 0 },
		viewportPageBounds: { x: 0, y: 0, w: 1, h: 1 },
		color: '#000000',
	})
)
