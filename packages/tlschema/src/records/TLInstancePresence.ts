import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { Box2dModel } from '../geometry-types'
import { TLCursor, TLScribble } from '../ui-types'
import { TLInstanceId } from './TLInstance'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'

/** @public */
export interface TLInstancePresence extends BaseRecord<'instance_presence', TLInstancePresenceId> {
	instanceId: TLInstanceId
	userId: string
	userName: string
	lastActivityTimestamp: number
	color: string // can be any hex color
	camera: { x: number; y: number; z: number }
	selectedIds: TLShapeId[]
	currentPageId: TLPageId
	brush: Box2dModel | null
	scribble: TLScribble | null
	screenBounds: Box2dModel
	followingUserId: string | null
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
).withDefaultProperties(() => ({
	lastActivityTimestamp: 0,
	followingUserId: null,
	color: '#FF0000',
	camera: {
		x: 0,
		y: 0,
		z: 1,
	},
	cursor: {
		x: 0,
		y: 0,
		type: 'default',
		rotation: 0,
	},
	screenBounds: {
		x: 0,
		y: 0,
		w: 1,
		h: 1,
	},
	selectedIds: [],
	brush: null,
	scribble: null,
}))
