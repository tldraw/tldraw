import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/store'
import { T } from '@tldraw/tlvalidate'
import { Box2dModel } from '../geometry-types'
import { cursorTypeValidator, scribbleTypeValidator, TLCursor, TLScribble } from '../ui-types'
import { idValidator } from '../validation'
import { TLInstanceId } from './TLInstance'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'

/** @public */
export interface TLInstancePresence extends BaseRecord<'instance_presence', TLInstancePresenceID> {
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
export type TLInstancePresenceID = ID<TLInstancePresence>

// --- VALIDATION ---
/** @public */
export const instancePresenceTypeValidator: T.Validator<TLInstancePresence> = T.model(
	'instance_presence',
	T.object({
		instanceId: idValidator<TLInstanceId>('instance'),
		typeName: T.literal('instance_presence'),
		id: idValidator<TLInstancePresenceID>('instance_presence'),
		userId: T.string,
		userName: T.string,
		lastActivityTimestamp: T.number,
		followingUserId: T.string.nullable(),
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

const Versions = {
	AddScribbleDelay: 1,
} as const

export const instancePresenceTypeMigrations = defineMigrations({
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
		migrations: instancePresenceTypeMigrations,
		validator: instancePresenceTypeValidator,
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
