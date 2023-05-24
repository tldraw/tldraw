import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { Box2dModel } from '../geometry-types'
import { TLCursor, TLScribble } from '../ui-types'
import { TLInstanceId } from './TLInstance'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'
import { TLUserId } from './TLUser'

/** @public */
export interface TLInstancePresence extends BaseRecord<'instance_presence', TLInstancePresenceId> {
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
export type TLInstancePresenceId = ID<TLInstancePresence>

const Versions = {
	AddScribbleDelay: 1,
} as const

/** @public */
export const instancePresenceTypeMigrator = new Migrator({
	currentVersion: Versions.AddScribbleDelay,
	migrators: {
		[Versions.AddScribbleDelay]: {
			up: (instance) => {
				if (instance.scribble !== null) {
					return { ...instance, scribble: { ...instance.scribble, delay: 0 } }
				}
				return { ...instance }
			},
			down: (instance) => {
				if (instance.scribble !== null) {
					const { delay: _delay, ...rest } = instance.scribble
					return { ...instance, scribble: rest }
				}
				return { ...instance }
			},
		},
	},
})

/** @public */
export const InstancePresenceRecordType = createRecordType<TLInstancePresence>(
	'instance_presence',
	{
		scope: 'presence',
	}
)
