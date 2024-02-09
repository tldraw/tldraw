import { BaseRecord, createRecordType, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { BoxModel, boxModelValidator } from '../misc/geometry-types'
import { idValidator } from '../misc/id-validator'
import { cursorValidator, TLCursor } from '../misc/TLCursor'
import { opacityValidator, TLOpacityType } from '../misc/TLOpacity'
import { scribbleValidator, TLScribble } from '../misc/TLScribble'
import { StyleProp } from '../styles/StyleProp'
import { pageIdValidator, TLPageId } from './TLPage'
import { TLShapeId } from './TLShape'

/**
 * TLInstance
 *
 * State that is particular to a single browser tab
 *
 * @public
 */
export interface TLInstance extends BaseRecord<'instance', TLInstanceId> {
	// 💡❗ If you make any changes to this type, make sure you also add a migration if required.
	// 💡❗ (see the tlschema README.md for instructions)
	currentPageId: TLPageId
	opacityForNextShape: TLOpacityType
	stylesForNextShape: Record<string, unknown>
	// ephemeral
	followingUserId: string | null
	highlightedUserIds: string[]
	brush: BoxModel | null
	cursor: TLCursor
	scribbles: TLScribble[]
	isFocusMode: boolean
	isDebugMode: boolean
	isToolLocked: boolean
	exportBackground: boolean
	screenBounds: BoxModel
	insets: boolean[]
	zoomBrush: BoxModel | null
	chatMessage: string
	isChatting: boolean
	isPenMode: boolean
	isGridMode: boolean
	canMoveCamera: boolean
	isFocused: boolean
	devicePixelRatio: number
	/**
	 * This is whether the primary input mechanism includes a pointing device of limited accuracy,
	 * such as a finger on a touchscreen.
	 * See: https://developer.mozilla.org/en-US/docs/Web/CSS/\@media/pointer
	 */
	isCoarsePointer: boolean
	/**
	 * Will be null if the pointer doesn't support hovering (e.g. touch), but true or false
	 * otherwise
	 */
	isHoveringCanvas: boolean | null
	openMenus: string[]
	isChangingStyle: boolean
	isReadonly: boolean
	meta: JsonObject
	duplicateProps: {
		shapeIds: TLShapeId[]
		offset: {
			x: number
			y: number
		}
	} | null
}

/** @public */
export type TLInstanceId = RecordId<TLInstance>

/** @internal */
export const instanceIdValidator = idValidator<TLInstanceId>('instance')

export function createInstanceRecordType(stylesById: Map<string, StyleProp<unknown>>) {
	const stylesForNextShapeValidators = {} as Record<string, T.Validator<unknown>>
	for (const [id, style] of stylesById) {
		stylesForNextShapeValidators[id] = T.optional(style)
	}

	const instanceTypeValidator: T.Validator<TLInstance> = T.model(
		'instance',
		T.object({
			typeName: T.literal('instance'),
			id: idValidator<TLInstanceId>('instance'),
			currentPageId: pageIdValidator,
			followingUserId: T.string.nullable(),
			brush: boxModelValidator.nullable(),
			opacityForNextShape: opacityValidator,
			stylesForNextShape: T.object(stylesForNextShapeValidators),
			cursor: cursorValidator,
			scribbles: T.arrayOf(scribbleValidator),
			isFocusMode: T.boolean,
			isDebugMode: T.boolean,
			isToolLocked: T.boolean,
			exportBackground: T.boolean,
			screenBounds: boxModelValidator,
			insets: T.arrayOf(T.boolean),
			zoomBrush: boxModelValidator.nullable(),
			isPenMode: T.boolean,
			isGridMode: T.boolean,
			chatMessage: T.string,
			isChatting: T.boolean,
			highlightedUserIds: T.arrayOf(T.string),
			canMoveCamera: T.boolean,
			isFocused: T.boolean,
			devicePixelRatio: T.number,
			isCoarsePointer: T.boolean,
			isHoveringCanvas: T.boolean.nullable(),
			openMenus: T.arrayOf(T.string),
			isChangingStyle: T.boolean,
			isReadonly: T.boolean,
			meta: T.jsonValue as T.ObjectValidator<JsonObject>,
			duplicateProps: T.object({
				shapeIds: T.arrayOf(idValidator<TLShapeId>('shape')),
				offset: T.object({
					x: T.number,
					y: T.number,
				}),
			}).nullable(),
		})
	)

	return createRecordType<TLInstance>('instance', {
		validator: instanceTypeValidator,
		scope: 'session',
	}).withDefaultProperties(
		(): Omit<TLInstance, 'typeName' | 'id' | 'currentPageId'> => ({
			followingUserId: null,
			opacityForNextShape: 1,
			stylesForNextShape: {},
			brush: null,
			scribbles: [],
			cursor: {
				type: 'default',
				rotation: 0,
			},
			isFocusMode: false,
			exportBackground: false,
			isDebugMode: process.env.NODE_ENV === 'development',
			isToolLocked: false,
			screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
			insets: [false, false, false, false],
			zoomBrush: null,
			isGridMode: false,
			isPenMode: false,
			chatMessage: '',
			isChatting: false,
			highlightedUserIds: [],
			canMoveCamera: true,
			isFocused: false,
			devicePixelRatio: typeof window === 'undefined' ? 1 : window.devicePixelRatio,
			isCoarsePointer: false,
			isHoveringCanvas: null,
			openMenus: [] as string[],
			isChangingStyle: false,
			isReadonly: false,
			meta: {},
			duplicateProps: null,
		})
	)
}

/** @public */
export const TLINSTANCE_ID = 'instance:instance' as TLInstanceId
