import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { BoxModel, boxModelValidator } from '../misc/geometry-types'
import { idValidator } from '../misc/id-validator'
import { cursorTypeValidator, TLCursor } from '../misc/TLCursor'
import { scribbleValidator, TLScribble } from '../misc/TLScribble'
import { TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'

/** @public */
export interface TLInstancePresence extends BaseRecord<'instance_presence', TLInstancePresenceID> {
	userId: string
	userName: string
	lastActivityTimestamp: number | null
	color: string // can be any hex color
	camera: { x: number; y: number; z: number } | null
	selectedShapeIds: TLShapeId[]
	currentPageId: TLPageId
	brush: BoxModel | null
	scribbles: TLScribble[]
	screenBounds: BoxModel | null
	followingUserId: string | null
	cursor: {
		x: number
		y: number
		type: TLCursor['type']
		rotation: number
	} | null
	chatMessage: string
	meta: JsonObject
}

/** @public */
export type TLInstancePresenceID = RecordId<TLInstancePresence>

/** @public */
export const instancePresenceValidator: T.Validator<TLInstancePresence> = T.model(
	'instance_presence',
	T.object({
		typeName: T.literal('instance_presence'),
		id: idValidator<TLInstancePresenceID>('instance_presence'),
		userId: T.string,
		userName: T.string,
		lastActivityTimestamp: T.number.nullable(),
		followingUserId: T.string.nullable(),
		cursor: T.object({
			x: T.number,
			y: T.number,
			type: cursorTypeValidator,
			rotation: T.number,
		}).nullable(),
		color: T.string,
		camera: T.object({
			x: T.number,
			y: T.number,
			z: T.number,
		}).nullable(),
		screenBounds: boxModelValidator.nullable(),
		selectedShapeIds: T.arrayOf(idValidator<TLShapeId>('shape')),
		currentPageId: idValidator<TLPageId>('page'),
		brush: boxModelValidator.nullable(),
		scribbles: T.arrayOf(scribbleValidator),
		chatMessage: T.string,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @public */
export const instancePresenceVersions = createMigrationIds('com.tldraw.instance_presence', {
	AddScribbleDelay: 1,
	RemoveInstanceId: 2,
	AddChatMessage: 3,
	AddMeta: 4,
	RenameSelectedShapeIds: 5,
	NullableCameraCursor: 6,
} as const)

export const instancePresenceMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.instance_presence',
	recordType: 'instance_presence',
	sequence: [
		{
			id: instancePresenceVersions.AddScribbleDelay,
			up: (instance: any) => {
				if (instance.scribble !== null) {
					instance.scribble.delay = 0
				}
			},
		},
		{
			id: instancePresenceVersions.RemoveInstanceId,
			up: (instance: any) => {
				delete instance.instanceId
			},
		},
		{
			id: instancePresenceVersions.AddChatMessage,
			up: (instance: any) => {
				instance.chatMessage = ''
			},
		},
		{
			id: instancePresenceVersions.AddMeta,
			up: (record: any) => {
				record.meta = {}
			},
		},
		{
			id: instancePresenceVersions.RenameSelectedShapeIds,
			up: (_record) => {
				// noop, whoopsie
			},
		},
		{
			id: instancePresenceVersions.NullableCameraCursor,
			up: (_record: any) => {
				// noop
			},
			down: (record: any) => {
				if (record.camera === null) {
					record.camera = { x: 0, y: 0, z: 1 }
				}
				if (record.lastActivityTimestamp === null) {
					record.lastActivityTimestamp = 0
				}
				if (record.cursor === null) {
					record.cursor = { type: 'default', x: 0, y: 0, rotation: 0 }
				}
				if (record.screenBounds === null) {
					record.screenBounds = { x: 0, y: 0, w: 1, h: 1 }
				}
			},
		},
	],
})

/** @public */
export const InstancePresenceRecordType = createRecordType<TLInstancePresence>(
	'instance_presence',
	{
		validator: instancePresenceValidator,
		scope: 'presence',
	}
).withDefaultProperties(() => ({
	lastActivityTimestamp: null,
	followingUserId: null,
	color: '#FF0000',
	camera: null,
	cursor: null,
	screenBounds: null,
	selectedShapeIds: [],
	brush: null,
	scribbles: [],
	chatMessage: '',
	meta: {},
}))
