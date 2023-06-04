import { BaseRecord, createRecordType, defineMigrations, RecordId } from '@tldraw/store'
import { T } from '@tldraw/validate'
import { Box2dModel } from '../misc/geometry-types'
import { idValidator } from '../misc/id-validator'
import { cursorValidator, TLCursor } from '../misc/TLCursor'
import { scribbleValidator, TLScribble } from '../misc/TLScribble'
import { alignValidator } from '../styles/TLAlignStyle'
import { arrowheadValidator } from '../styles/TLArrowheadStyle'
import { TL_STYLE_TYPES, TLStyleType } from '../styles/TLBaseStyle'
import { colorValidator } from '../styles/TLColorStyle'
import { dashValidator } from '../styles/TLDashStyle'
import { fillValidator } from '../styles/TLFillStyle'
import { fontValidator } from '../styles/TLFontStyle'
import { geoValidator } from '../styles/TLGeoStyle'
import { iconValidator } from '../styles/TLIconStyle'
import { opacityValidator } from '../styles/TLOpacityStyle'
import { sizeValidator } from '../styles/TLSizeStyle'
import { splineValidator } from '../styles/TLSplineStyle'
import { verticalAlignValidator } from '../styles/TLVerticalAlignStyle'
import { pageIdValidator, TLPageId } from './TLPage'
import { TLShapeProps } from './TLShape'

/** @public */
export type TLInstancePropsForNextShape = Pick<TLShapeProps, TLStyleType>

/**
 * TLInstance
 *
 * State that is particular to a single browser tab
 *
 * @public
 */
export interface TLInstance extends BaseRecord<'instance', TLInstanceId> {
	currentPageId: TLPageId
	followingUserId: string | null
	brush: Box2dModel | null
	propsForNextShape: TLInstancePropsForNextShape
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
}

/** @public */
export type TLInstanceId = RecordId<TLInstance>

/** @internal */
export const instanceIdValidator = idValidator<TLInstanceId>('instance')

/** @internal */
export const instanceTypeValidator: T.Validator<TLInstance> = T.model(
	'instance',
	T.object({
		typeName: T.literal('instance'),
		id: idValidator<TLInstanceId>('instance'),
		currentPageId: pageIdValidator,
		followingUserId: T.string.nullable(),
		brush: T.boxModel.nullable(),
		propsForNextShape: T.object({
			color: colorValidator,
			labelColor: colorValidator,
			dash: dashValidator,
			fill: fillValidator,
			size: sizeValidator,
			opacity: opacityValidator,
			font: fontValidator,
			align: alignValidator,
			verticalAlign: verticalAlignValidator,
			icon: iconValidator,
			geo: geoValidator,
			arrowheadStart: arrowheadValidator,
			arrowheadEnd: arrowheadValidator,
			spline: splineValidator,
		}),
		cursor: cursorValidator,
		scribble: scribbleValidator.nullable(),
		isFocusMode: T.boolean,
		isDebugMode: T.boolean,
		isToolLocked: T.boolean,
		exportBackground: T.boolean,
		screenBounds: T.boxModel,
		zoomBrush: T.boxModel.nullable(),
		chatMessage: T.string,
		isChatting: T.boolean,
	})
)

const Versions = {
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
	AddChat: 12,
} as const

export { Versions as instanceTypeVersions }

/** @internal */
export const instanceMigrations = defineMigrations({
	currentVersion: Versions.AddChat,
	migrators: {
		[Versions.AddTransparentExportBgs]: {
			up: (instance: TLInstance) => {
				return { ...instance, exportBackground: true }
			},
			down: ({ exportBackground: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[Versions.RemoveDialog]: {
			up: ({ dialog: _, ...instance }: any) => {
				return instance
			},
			down: (instance: TLInstance) => {
				return { ...instance, dialog: null }
			},
		},
		[Versions.AddToolLockMode]: {
			up: (instance: TLInstance) => {
				return { ...instance, isToolLocked: false }
			},
			down: ({ isToolLocked: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[Versions.RemoveExtraPropsForNextShape]: {
			up: ({ propsForNextShape, ...instance }: any) => {
				return {
					...instance,
					propsForNextShape: Object.fromEntries(
						Object.entries(propsForNextShape).filter(([key]) =>
							TL_STYLE_TYPES.has(key as TLStyleType)
						)
					),
				}
			},
			down: (instance: TLInstance) => {
				// we can't restore these, so do nothing :/
				return instance
			},
		},
		[Versions.AddLabelColor]: {
			up: ({ propsForNextShape, ...instance }: any) => {
				return {
					...instance,
					propsForNextShape: {
						...propsForNextShape,
						labelColor: 'black',
					},
				}
			},
			down: (instance: TLInstance) => {
				const { labelColor: _, ...rest } = instance.propsForNextShape
				return {
					...instance,
					propsForNextShape: {
						...rest,
					},
				}
			},
		},
		[Versions.AddFollowingUserId]: {
			up: (instance: TLInstance) => {
				return { ...instance, followingUserId: null }
			},
			down: ({ followingUserId: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[Versions.RemoveAlignJustify]: {
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
		[Versions.AddZoom]: {
			up: (instance: TLInstance) => {
				return { ...instance, zoomBrush: null }
			},
			down: ({ zoomBrush: _, ...instance }: TLInstance) => {
				return instance
			},
		},
		[Versions.AddVerticalAlign]: {
			up: (instance: TLInstance) => {
				return {
					...instance,
					propsForNextShape: {
						...instance.propsForNextShape,
						verticalAlign: 'middle',
					},
				}
			},
			down: (instance: TLInstance) => {
				const { verticalAlign: _, ...propsForNextShape } = instance.propsForNextShape
				return {
					...instance,
					propsForNextShape,
				}
			},
		},
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
		[Versions.RemoveUserId]: {
			up: ({ userId: _, ...instance }: any) => {
				return instance
			},
			down: (instance: TLInstance) => {
				return { ...instance, userId: 'user:none' }
			},
		},
		[Versions.AddChat]: {
			up: (instance: TLInstance) => {
				return { ...instance, chatMessage: '', isChatting: false }
			},
			down: ({ chatMessage: _, isChatting: __, ...instance }: TLInstance) => {
				return instance
			},
		},
	},
})

/** @public */
export const InstanceRecordType = createRecordType<TLInstance>('instance', {
	migrations: instanceMigrations,
	validator: instanceTypeValidator,
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLInstance, 'typeName' | 'id' | 'currentPageId'> => ({
		followingUserId: null,
		propsForNextShape: {
			opacity: '1',
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
		brush: null,
		scribble: null,
		cursor: {
			type: 'default',
			color: 'black',
			rotation: 0,
		},
		isFocusMode: false,
		exportBackground: false,
		isDebugMode: process.env.NODE_ENV === 'development',
		isToolLocked: false,
		screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
		zoomBrush: null,
		chatMessage: '',
		isChatting: false,
	})
)
