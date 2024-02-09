import { BaseRecord, createRecordType, RecordId } from '@tldraw/store'
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
	// 💡❗ If you make any changes to this type, make sure you also add a migration if required.
	// 💡❗ (see the tlschema README.md for instructions)
	userId: string
	userName: string
	lastActivityTimestamp: number
	color: string // can be any hex color
	camera: { x: number; y: number; z: number }
	selectedShapeIds: TLShapeId[]
	currentPageId: TLPageId
	brush: BoxModel | null
	scribbles: TLScribble[]
	screenBounds: BoxModel
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
		screenBounds: boxModelValidator,
		selectedShapeIds: T.arrayOf(idValidator<TLShapeId>('shape')),
		currentPageId: idValidator<TLPageId>('page'),
		brush: boxModelValidator.nullable(),
		scribbles: T.arrayOf(scribbleValidator),
		chatMessage: T.string,
		meta: T.jsonValue as T.ObjectValidator<JsonObject>,
	})
)

/** @public */
export const InstancePresenceRecordType = createRecordType<TLInstancePresence>(
	'instance_presence',
	{
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
	scribbles: [],
	chatMessage: '',
	meta: {},
}))
