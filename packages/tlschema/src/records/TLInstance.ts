import {
	BaseRecord,
	createMigrationIds,
	createRecordMigrationSequence,
	createRecordType,
	RecordId,
} from '@tldraw/store'
import { filterEntries, JsonObject } from '@tldraw/utils'
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
	followingUserId: string | null
	highlightedUserIds: string[]
	brush: BoxModel | null
	cursor: TLCursor
	scribbles: TLScribble[]
	isFocusMode: boolean
	isDebugMode: boolean
	isToolLocked: boolean
	exportBackground: boolean
	embedScene: boolean
	screenBounds: BoxModel
	insets: boolean[]
	zoomBrush: BoxModel | null
	chatMessage: string
	isChatting: boolean
	isPenMode: boolean
	isGridMode: boolean
	isFocused: boolean
	devicePixelRatio: number
	/**
	 * This is whether the primary input mechanism includes a pointing device of limited accuracy,
	 * such as a finger on a touchscreen.
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

/** @internal */
export const shouldKeyBePreservedBetweenSessions = {
	// This object defines keys that should be preserved across calls to loadSnapshot()

	id: false, // meta
	typeName: false, // meta

	currentPageId: false, // does not preserve because who knows if the page still exists
	opacityForNextShape: false, // does not preserve because it's a temporary state
	stylesForNextShape: false, // does not preserve because it's a temporary state
	followingUserId: false, // does not preserve because it's a temporary state
	highlightedUserIds: false, // does not preserve because it's a temporary state
	brush: false, // does not preserve because it's a temporary state
	cursor: false, // does not preserve because it's a temporary state
	scribbles: false, // does not preserve because it's a temporary state

	isFocusMode: true, // preserves because it's a user preference
	isDebugMode: true, // preserves because it's a user preference
	isToolLocked: true, // preserves because it's a user preference
	exportBackground: true, // preserves because it's a user preference
	embedScene: true, // preserves because it's a user preference
	screenBounds: true, // preserves because it's capturing the user's screen state
	insets: true, // preserves because it's capturing the user's screen state

	zoomBrush: false, // does not preserve because it's a temporary state
	chatMessage: false, // does not preserve because it's a temporary state
	isChatting: false, // does not preserve because it's a temporary state
	isPenMode: false, // does not preserve because it's a temporary state

	isGridMode: true, // preserves because it's a user preference
	isFocused: true, // preserves because obviously
	devicePixelRatio: true, // preserves because it captures the user's screen state
	isCoarsePointer: true, // preserves because it captures the user's screen state
	isHoveringCanvas: false, // does not preserve because it's a temporary state
	openMenus: false, // does not preserve because it's a temporary state
	isChangingStyle: false, // does not preserve because it's a temporary state
	isReadonly: true, // preserves because it's a config option
	meta: false, // does not preserve because who knows what's in there, leave it up to sdk users to save and reinstate
	duplicateProps: false, //
} as const satisfies { [K in keyof TLInstance]: boolean }

/** @internal */
export function pluckPreservingValues(val?: TLInstance | null): null | Partial<TLInstance> {
	return val
		? (filterEntries(val, (key) => {
				return shouldKeyBePreservedBetweenSessions[key as keyof TLInstance]
			}) as Partial<TLInstance>)
		: null
}

/** @public */
export type TLInstanceId = RecordId<TLInstance>

/** @public */
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
			embedScene: T.boolean,
			screenBounds: boxModelValidator,
			insets: T.arrayOf(T.boolean),
			zoomBrush: boxModelValidator.nullable(),
			isPenMode: T.boolean,
			isGridMode: T.boolean,
			chatMessage: T.string,
			isChatting: T.boolean,
			highlightedUserIds: T.arrayOf(T.string),
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
		ephemeralKeys: {
			currentPageId: false,
			meta: false,

			followingUserId: true,
			opacityForNextShape: true,
			stylesForNextShape: true,
			brush: true,
			cursor: true,
			scribbles: true,
			isFocusMode: true,
			isDebugMode: true,
			isToolLocked: true,
			exportBackground: true,
			embedScene: true,
			screenBounds: true,
			insets: true,
			zoomBrush: true,
			isPenMode: true,
			isGridMode: true,
			chatMessage: true,
			isChatting: true,
			highlightedUserIds: true,
			isFocused: true,
			devicePixelRatio: true,
			isCoarsePointer: true,
			isHoveringCanvas: true,
			openMenus: true,
			isChangingStyle: true,
			isReadonly: true,
			duplicateProps: true,
		},
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
			embedScene: false,
			isDebugMode: false,
			isToolLocked: false,
			screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
			insets: [false, false, false, false],
			zoomBrush: null,
			isGridMode: false,
			isPenMode: false,
			chatMessage: '',
			isChatting: false,
			highlightedUserIds: [],
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
	RemoveCanMoveCamera: 25,
} as const)

// TODO: rewrite these to use mutation

/** @public */
export const instanceMigrations = createRecordMigrationSequence({
	sequenceId: 'com.tldraw.instance',
	recordType: 'instance',
	sequence: [
		{
			id: instanceVersions.AddTransparentExportBgs,
			up: (instance) => {
				return { ...instance, exportBackground: true }
			},
		},
		{
			id: instanceVersions.RemoveDialog,
			up: ({ dialog: _, ...instance }: any) => {
				return instance
			},
		},

		{
			id: instanceVersions.AddToolLockMode,
			up: (instance) => {
				return { ...instance, isToolLocked: false }
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
		},
		{
			id: instanceVersions.AddFollowingUserId,
			up: (instance) => {
				return { ...instance, followingUserId: null }
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
		},
		{
			id: instanceVersions.AddScribbleDelay,
			up: (instance: any) => {
				if (instance.scribble !== null) {
					return { ...instance, scribble: { ...instance.scribble, delay: 0 } }
				}
				return { ...instance }
			},
		},
		{
			id: instanceVersions.RemoveUserId,
			up: ({ userId: _, ...instance }: any) => {
				return instance
			},
		},
		{
			id: instanceVersions.AddIsPenModeAndIsGridMode,
			up: (instance) => {
				return { ...instance, isPenMode: false, isGridMode: false }
			},
		},
		{
			id: instanceVersions.HoistOpacity,
			up: ({ propsForNextShape: { opacity, ...propsForNextShape }, ...instance }: any) => {
				return { ...instance, opacityForNextShape: Number(opacity ?? '1'), propsForNextShape }
			},
		},
		{
			id: instanceVersions.AddChat,
			up: (instance) => {
				return { ...instance, chatMessage: '', isChatting: false }
			},
		},
		{
			id: instanceVersions.AddHighlightedUserIds,
			up: (instance) => {
				return { ...instance, highlightedUserIds: [] }
			},
		},
		{
			id: instanceVersions.ReplacePropsForNextShapeWithStylesForNextShape,
			up: ({ propsForNextShape: _, ...instance }: any) => {
				return { ...instance, stylesForNextShape: {} }
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
		},
		{
			id: instanceVersions.ReadOnlyReadonly,
			up: ({ isReadOnly: _isReadOnly, ...record }: any) => {
				return {
					...record,
					isReadonly: _isReadOnly,
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
		},
		{
			id: instanceVersions.AddScribbles,
			up: ({ scribble: _, ...record }: any) => {
				return {
					...record,
					scribbles: [],
				}
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
		{
			id: instanceVersions.RemoveCanMoveCamera,
			up: ({ canMoveCamera: _, ...record }: any) => {
				return {
					...record,
				}
			},
			down: (instance) => {
				return { ...instance, canMoveCamera: true }
			},
		},
	],
})

/** @public */
export const TLINSTANCE_ID = 'instance:instance' as TLInstanceId
