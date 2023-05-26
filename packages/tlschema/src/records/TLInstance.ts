import { BaseRecord, createRecordType, ID, Migrator } from '@tldraw/tlstore'
import { Box2dModel } from '../geometry-types'
import { TL_STYLE_TYPES, TLStyleType } from '../style-types'
import { TLCursor, TLScribble } from '../ui-types'
import { TLPageId } from './TLPage'
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
}

/** @public */
export type TLInstanceId = ID<TLInstance>

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
} as const

export { Versions as instanceTypeVersions }

/** @public */
export const instanceTypeMigrator = new Migrator({
	currentVersion: Versions.RemoveUserId,
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
	},
})

/** @public */
export const InstanceRecordType = createRecordType<TLInstance>('instance', {
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
	})
)
