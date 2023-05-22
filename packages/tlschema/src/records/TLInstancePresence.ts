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
export const TLInstancePresence = createRecordType<TLInstancePresence>('instance_presence', {
	migrations: instancePresenceTypeMigrations,
	validator: instancePresenceTypeValidator,
	scope: 'presence',
})
