import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { JsonObject } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { Box2dModel, box2dModelValidator } from '../misc/geometry-types'
import { idValidator } from '../misc/id-validator'
import { cursorValidator, TLCursor } from '../misc/TLCursor'
import { opacityValidator, TLOpacityType } from '../misc/TLOpacity'
import { scribbleValidator, TLScribble } from '../misc/TLScribble'
import { StyleProp } from '../styles/StyleProp'
import { pageIdValidator, TLPageId } from './TLPage'

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
	brush: Box2dModel | null
	cursor: TLCursor
	scribble: TLScribble | null
	isFocusMode: boolean
	isDebugMode: boolean
	isToolLocked: boolean
	exportBackground: boolean
	screenBounds: Box2dModel
	zoomBrush: Box2dModel | null
	chatMessage: string
	isChatting: boolean
	isPenMode: boolean
	isGridMode: boolean
	canMoveCamera: boolean
	isFocused: boolean
	devicePixelRatio: number
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
			brush: box2dModelValidator.nullable(),
			opacityForNextShape: opacityValidator,
			stylesForNextShape: T.object(stylesForNextShapeValidators),
			cursor: cursorValidator,
			scribble: scribbleValidator.nullable(),
			isFocusMode: T.boolean,
			isDebugMode: T.boolean,
			isToolLocked: T.boolean,
			exportBackground: T.boolean,
			screenBounds: box2dModelValidator,
			zoomBrush: box2dModelValidator.nullable(),
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
		})
	)

	return createRecordType<TLInstance>('instance', {
		migrations: instanceMigrations,
		validator: instanceTypeValidator,
		scope: 'session',
	}).withDefaultProperties(
		(): Omit<TLInstance, 'typeName' | 'id' | 'currentPageId'> => ({
			followingUserId: null,
			opacityForNextShape: 1,
			stylesForNextShape: {},
			brush: null,
			scribble: null,
			cursor: {
				type: 'default',
				rotation: 0,
			},
			isFocusMode: false,
			exportBackground: false,
			isDebugMode: process.env.NODE_ENV === 'development',
			isToolLocked: false,
			screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
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
		})
	)
}

/** @internal */
export const instanceVersions = {
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
} as const

/** @public */
export const instanceMigrations = defineMigrations({
	currentVersion: instanceVersions.AddHoveringCanvas,
	migrators: {
		[instanceVersions.AddTransparentExportBgs]: {
			up: (instance: TLInstance) => {
				return { ...instance, exportBackground: true }
			},
			down: ({ exportBackground: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[instanceVersions.RemoveDialog]: {
			up: ({ dialog: _, ...instance }: any) => {
				return instance
			},
			down: (instance: TLInstance) => {
				return { ...instance, dialog: null }
			},
		},
		[instanceVersions.AddToolLockMode]: {
			up: (instance: TLInstance) => {
				return { ...instance, isToolLocked: false }
			},
			down: ({ isToolLocked: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[instanceVersions.RemoveExtraPropsForNextShape]: {
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
			down: (instance: TLInstance) => {
				// we can't restore these, so do nothing :/
				return instance
			},
		},
		[instanceVersions.AddLabelColor]: {
			up: ({ propsForNextShape, ...instance }: any) => {
				return {
					...instance,
					propsForNextShape: {
						...propsForNextShape,
						labelColor: 'black',
					},
				}
			},
			down: (instance) => {
				const { labelColor: _, ...rest } = instance.propsForNextShape
				return {
					...instance,
					propsForNextShape: {
						...rest,
					},
				}
			},
		},
		[instanceVersions.AddFollowingUserId]: {
			up: (instance: TLInstance) => {
				return { ...instance, followingUserId: null }
			},
			down: ({ followingUserId: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[instanceVersions.RemoveAlignJustify]: {
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
			down: (instance: TLInstance) => {
				return { ...instance }
			},
		},
		[instanceVersions.AddZoom]: {
			up: (instance: TLInstance) => {
				return { ...instance, zoomBrush: null }
			},
			down: ({ zoomBrush: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[instanceVersions.AddVerticalAlign]: {
			up: (instance) => {
				return {
					...instance,
					propsForNextShape: {
						...instance.propsForNextShape,
						verticalAlign: 'middle',
					},
				}
			},
			down: (instance) => {
				const { verticalAlign: _, ...propsForNextShape } = instance.propsForNextShape
				return {
					...instance,
					propsForNextShape,
				}
			},
		},
		[instanceVersions.AddScribbleDelay]: {
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
		[instanceVersions.RemoveUserId]: {
			up: ({ userId: _, ...instance }: any) => {
				return instance
			},
			down: (instance: TLInstance) => {
				return { ...instance, userId: 'user:none' }
			},
		},
		[instanceVersions.AddIsPenModeAndIsGridMode]: {
			up: (instance: TLInstance) => {
				return { ...instance, isPenMode: false, isGridMode: false }
			},
			down: ({ isPenMode: _, isGridMode: __, ...instance }: TLInstance) => {
				return instance
			},
		},
		[instanceVersions.HoistOpacity]: {
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
		[instanceVersions.AddChat]: {
			up: (instance: TLInstance) => {
				return { ...instance, chatMessage: '', isChatting: false }
			},
			down: ({ chatMessage: _, isChatting: __, ...instance }: TLInstance) => {
				return instance
			},
		},
		[instanceVersions.AddHighlightedUserIds]: {
			up: (instance: TLInstance) => {
				return { ...instance, highlightedUserIds: [] }
			},
			down: ({ highlightedUserIds: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[instanceVersions.ReplacePropsForNextShapeWithStylesForNextShape]: {
			up: ({ propsForNextShape: _, ...instance }) => {
				return { ...instance, stylesForNextShape: {} }
			},
			down: ({ stylesForNextShape: _, ...instance }: TLInstance) => {
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
		[instanceVersions.AddMeta]: {
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
		[instanceVersions.RemoveCursorColor]: {
			up: (record) => {
				const { color: _, ...cursor } = record.cursor
				return {
					...record,
					cursor,
				}
			},
			down: (record) => {
				return {
					...record,
					cursor: {
						...record.cursor,
						color: 'black',
					},
				}
			},
		},
		[instanceVersions.AddLonelyProperties]: {
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
			}) => {
				return {
					...record,
				}
			},
		},
		[instanceVersions.ReadOnlyReadonly]: {
			up: ({ isReadOnly: _isReadOnly, ...record }) => {
				return {
					...record,
					isReadonly: _isReadOnly,
				}
			},
			down: ({ isReadonly: _isReadonly, ...record }) => {
				return {
					...record,
					isReadOnly: _isReadonly,
				}
			},
		},
		[instanceVersions.AddHoveringCanvas]: {
			up: (record) => {
				return {
					...record,
					isHoveringCanvas: null,
				}
			},
			down: ({ isHoveringCanvas: _, ...record }) => {
				return {
					...record,
				}
			},
		},
	},
})

/** @public */
export const TLINSTANCE_ID = 'instance:instance' as TLInstanceId
