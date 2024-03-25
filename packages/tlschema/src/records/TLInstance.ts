import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrations,
	createRecordType,
	RecordId,
} from '@tldraw/store'
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

/** @internal */
export const instanceVersions = createMigrationIds('com.tldraw.instance', {
	AddTransparentExportBgs: 1,
	RemoveDialog: 2,
	AddToolLockMode: 3,
	RemoveExtraPropsForNextShape: 4,
	AddLabelColor: 5,
	AddFollowingUserId: 6,
	RemoveAlignJustify: 7,
	AddZoom: 8,
	AddVerticalAlign: 9,
	AddScribbleDelay: 10,
	RemoveUserId: 11,
	AddIsPenModeAndIsGridMode: 12,
	HoistOpacity: 13,
	AddChat: 14,
	AddHighlightedUserIds: 15,
	ReplacePropsForNextShapeWithStylesForNextShape: 16,
	AddMeta: 17,
	RemoveCursorColor: 18,
	AddLonelyProperties: 19,
	ReadOnlyReadonly: 20,
	AddHoveringCanvas: 21,
	AddScribbles: 22,
	AddInset: 23,
	AddDuplicateProps: 24,
} as const)

// TODO: rewrite these to use mutation

/** @public */
export const instanceMigrations = createRecordMigrations({
	recordType: 'instance',
	sequence: [
		{
			id: instanceVersions.AddTransparentExportBgs,
			up: (instance) => {
				return { ...instance, exportBackground: true }
			},
			down: ({ exportBackground: _, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.RemoveDialog,
			up: ({ dialog: _, ...instance }: any) => {
				return instance
			},
			down: (instance) => {
				return { ...instance, dialog: null }
			},
		},

		{
			id: instanceVersions.AddToolLockMode,
			up: (instance) => {
				return { ...instance, isToolLocked: false }
			},
			down: ({ isToolLocked: _, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.RemoveExtraPropsForNextShape,
			up: ({ propsForNextShape, ...instance }: any) => {
				return {
					...instance,
					propsForNextShape: Object.fromEntries(
						Object.entries(propsForNextShape).filter(([key]) =>
							[
								'color',
								'labelColor',
								'dash',
								'fill',
								'size',
								'font',
								'align',
								'verticalAlign',
								'icon',
								'geo',
								'arrowheadStart',
								'arrowheadEnd',
								'spline',
							].includes(key)
						)
					),
				}
			},
		},
		{
			id: instanceVersions.AddLabelColor,
			up: ({ propsForNextShape, ...instance }: any) => {
				return {
					...instance,
					propsForNextShape: {
						...propsForNextShape,
						labelColor: 'black',
					},
				}
			},
			down: (instance: any) => {
				const { labelColor: _, ...rest } = instance.propsForNextShape
				return {
					...instance,
					propsForNextShape: {
						...rest,
					},
				}
			},
		},
		{
			id: instanceVersions.AddFollowingUserId,
			up: (instance) => {
				return { ...instance, followingUserId: null }
			},
			down: ({ followingUserId: _, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.RemoveAlignJustify,
			up: (instance: any) => {
				let newAlign = instance.propsForNextShape.align
				if (newAlign === 'justify') {
					newAlign = 'start'
				}

				return {
					...instance,
					propsForNextShape: {
						...instance.propsForNextShape,
						align: newAlign,
					},
				}
			},
		},
		{
			id: instanceVersions.AddZoom,
			up: (instance) => {
				return { ...instance, zoomBrush: null }
			},
			down: ({ zoomBrush: _, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.AddVerticalAlign,
			up: (instance: any) => {
				return {
					...instance,
					propsForNextShape: {
						...instance.propsForNextShape,
						verticalAlign: 'middle',
					},
				}
			},
			down: (instance: any) => {
				const { verticalAlign: _, ...propsForNextShape } = instance.propsForNextShape
				return {
					...instance,
					propsForNextShape,
				}
			},
		},
		{
			id: instanceVersions.AddScribbleDelay,
			up: (instance: any) => {
				if (instance.scribble !== null) {
					return { ...instance, scribble: { ...instance.scribble, delay: 0 } }
				}
				return { ...instance }
			},
			down: (instance: any) => {
				if (instance.scribble !== null) {
					const { delay: _delay, ...rest } = instance.scribble
					return { ...instance, scribble: rest }
				}
				return { ...instance }
			},
		},
		{
			id: instanceVersions.RemoveUserId,
			up: ({ userId: _, ...instance }: any) => {
				return instance
			},
			down: (instance: any) => {
				return { ...instance, userId: 'user:none' }
			},
		},
		{
			id: instanceVersions.AddIsPenModeAndIsGridMode,
			up: (instance) => {
				return { ...instance, isPenMode: false, isGridMode: false }
			},
			down: ({ isPenMode: _, isGridMode: __, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.HoistOpacity,
			up: ({ propsForNextShape: { opacity, ...propsForNextShape }, ...instance }: any) => {
				return { ...instance, opacityForNextShape: Number(opacity ?? '1'), propsForNextShape }
			},
			down: ({ opacityForNextShape: opacity, ...instance }: any) => {
				return {
					...instance,
					propsForNextShape: {
						...instance.propsForNextShape,
						opacity:
							opacity < 0.175
								? '0.1'
								: opacity < 0.375
									? '0.25'
									: opacity < 0.625
										? '0.5'
										: opacity < 0.875
											? '0.75'
											: '1',
					},
				}
			},
		},
		{
			id: instanceVersions.AddChat,
			up: (instance) => {
				return { ...instance, chatMessage: '', isChatting: false }
			},
			down: ({ chatMessage: _, isChatting: __, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.AddHighlightedUserIds,
			up: (instance) => {
				return { ...instance, highlightedUserIds: [] }
			},
			down: ({ highlightedUserIds: _, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.ReplacePropsForNextShapeWithStylesForNextShape,
			up: ({ propsForNextShape: _, ...instance }: any) => {
				return { ...instance, stylesForNextShape: {} }
			},
			down: ({ stylesForNextShape: _, ...instance }: any) => {
				return {
					...instance,
					propsForNextShape: {
						color: 'black',
						labelColor: 'black',
						dash: 'draw',
						fill: 'none',
						size: 'm',
						icon: 'file',
						font: 'draw',
						align: 'middle',
						verticalAlign: 'middle',
						geo: 'rectangle',
						arrowheadStart: 'none',
						arrowheadEnd: 'arrow',
						spline: 'line',
					},
				}
			},
		},
		{
			id: instanceVersions.AddMeta,
			up: (record) => {
				return {
					...record,
					meta: {},
				}
			},
			down: ({ meta: _, ...record }: any) => {
				return record
			},
		},
		{
			id: instanceVersions.RemoveCursorColor,
			up: (record: any) => {
				const { color: _, ...cursor } = record.cursor
				return {
					...record,
					cursor,
				}
			},
			down: (record: any) => {
				return {
					...record,
					cursor: {
						...record.cursor,
						color: 'black',
					},
				}
			},
		},
		{
			id: instanceVersions.AddLonelyProperties,
			up: (record) => {
				return {
					...record,
					canMoveCamera: true,
					isFocused: false,
					devicePixelRatio: 1,
					isCoarsePointer: false,
					openMenus: [],
					isChangingStyle: false,
					isReadOnly: false,
				}
			},
			down: ({
				canMoveCamera: _canMoveCamera,
				isFocused: _isFocused,
				devicePixelRatio: _devicePixelRatio,
				isCoarsePointer: _isCoarsePointer,
				openMenus: _openMenus,
				isChangingStyle: _isChangingStyle,
				isReadOnly: _isReadOnly,
				...record
			}: any) => {
				return {
					...record,
				}
			},
		},
		{
			id: instanceVersions.ReadOnlyReadonly,
			up: ({ isReadOnly: _isReadOnly, ...record }: any) => {
				return {
					...record,
					isReadonly: _isReadOnly,
				}
			},
			down: ({ isReadonly: _isReadonly, ...record }: any) => {
				return {
					...record,
					isReadOnly: _isReadonly,
				}
			},
		},
		{
			id: instanceVersions.AddHoveringCanvas,
			up: (record) => {
				return {
					...record,
					isHoveringCanvas: null,
				}
			},
			down: ({ isHoveringCanvas: _, ...record }: any) => {
				return {
					...record,
				}
			},
		},
		{
			id: instanceVersions.AddScribbles,
			up: ({ scribble: _, ...record }: any) => {
				return {
					...record,
					scribbles: [],
				}
			},
			down: ({ scribbles: _, ...record }: any) => {
				return { ...record, scribble: null }
			},
		},
		{
			id: instanceVersions.AddInset,
			up: (record) => {
				return {
					...record,
					insets: [false, false, false, false],
				}
			},
			down: ({ insets: _, ...record }: any) => {
				return {
					...record,
				}
			},
		},
		{
			id: instanceVersions.AddDuplicateProps,
			up: (record) => {
				return {
					...record,
					duplicateProps: null,
				}
			},
			down: ({ duplicateProps: _, ...record }: any) => {
				return {
					...record,
				}
			},
		},
	],
})

/** @public */
export const TLINSTANCE_ID = 'instance:instance' as TLInstanceId
