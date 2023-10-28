import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { Box2dModel, box2dModelValidator } from '../misc/geometry-types'
import { idValidator } from '../misc/id-validator'
import { cursorTypeValidator, TLCursor } from '../misc/TLCursor'
import { scribbleValidator, TLScribble } from '../misc/TLScribble'
import { TLINSTANCE_ID } from './TLInstance'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'

/** @public */
export interface TLInstancePresence extends BaseRecord<'instance_presence', TLInstancePresenceID> {
	userId: string
	userName: string
	lastActivityTimestamp: number
	color: string // can be any hex color
	camera: { x: number; y: number; z: number }
	selectedShapeIds: TLShapeId[]
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
	chatMessage: string
	meta: JsonObject
}

/** @public */
export type TLInstancePresenceID = RecordId<TLInstancePresence>

/** @internal */
export const instancePresenceValidator: T.Validator<TLInstancePresence> = T.model(
	'instance_presence',
	T.object({
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
		screenBounds: box2dModelValidator,
		selectedShapeIds: T.arrayOf(idValidator<TLShapeId>('shape')),
		currentPageId: idValidator<TLPageId>('page'),
		brush: box2dModelValidator.nullable(),
		scribble: scribbleValidator.nullable(),
		chatMessage: T.string,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @internal */
export const instancePresenceVersions = {
	AddScribbleDelay: 1,
	RemoveInstanceId: 2,
	AddChatMessage: 3,
	AddMeta: 4,
	RenameSelectedShapeIds: 5,
} as const

export const instancePresenceMigrations = defineMigrations({
	currentVersion: instancePresenceVersions.RenameSelectedShapeIds,
	migrators: {
		[instancePresenceVersions.AddScribbleDelay]: {
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
		[instancePresenceVersions.RemoveInstanceId]: {
			up: ({ instanceId: _, ...instance }) => {
				return instance
			},
			down: (instance) => {
				return { ...instance, instanceId: TLINSTANCE_ID }
			},
		},
		[instancePresenceVersions.AddChatMessage]: {
			up: (instance) => {
				return { ...instance, chatMessage: '' }
			},
			down: ({ chatMessage: _, ...instance }) => {
				return instance
			},
		},
		[instancePresenceVersions.AddMeta]: {
			up: (record) => {
				return {
					...record,
					meta: {},
				}
			},
			down: ({ meta: _, ...record }) => {
				return {
					...record,
				}
			},
		},
		[instancePresenceVersions.RenameSelectedShapeIds]: {
			up: (record) => {
				const { selectedShapeIds, ...rest } = record
				return {
					selectedShapeIds: selectedShapeIds,
					...rest,
				}
			},
			down: (record) => {
				const { selectedShapeIds, ...rest } = record
				return {
					selectedShapeIds: selectedShapeIds,
					...rest,
				}
			},
		},
	},
})

/** @public */
export const InstancePresenceRecordType = createRecordType<TLInstancePresence>(
	'instance_presence',
	{
		migrations: instancePresenceMigrations,
		validator: instancePresenceValidator,
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
	selectedShapeIds: [],
	brush: null,
	scribble: null,
	chatMessage: '',
	meta: {},
}))
