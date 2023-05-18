import { BaseRecord, createRecordType, defineMigrations, ID } from '@tldraw/tlstore'
import { T } from '@tldraw/tlvalidate'
import { Box2dModel } from '../geometry-types'
import { TL_STYLE_TYPES, TLStyleType } from '../style-types'
import { cursorValidator, scribbleTypeValidator, TLCursor, TLScribble } from '../ui-types'
import {
	alignValidator,
	arrowheadValidator,
	colorValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	geoValidator,
	iconValidator,
	idValidator,
	opacityValidator,
	pageIdValidator,
	sizeValidator,
	splineValidator,
	userIdValidator,
} from '../validation'
import { TLPageId } from './TLPage'
import { TLShapeProps } from './TLShape'
import { TLUserId } from './TLUser'

/** @public */
export type TLInstancePropsForNextShape = Pick<TLShapeProps, TLStyleType>

/**
 * TLInstance
 *
 * State that is particular to a single browser tab
 *
 * @public
 */
export interface TLInstance extends BaseRecord<'instance'> {
	userId: TLUserId
	currentPageId: TLPageId
	followingUserId: TLUserId | null
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

// --- VALIDATION ---
/** @public */
export const instanceTypeValidator: T.Validator<TLInstance> = T.model(
	'instance',
	T.object({
		typeName: T.literal('instance'),
		id: idValidator<TLInstanceId>('instance'),
		userId: userIdValidator,
		currentPageId: pageIdValidator,
		followingUserId: userIdValidator.nullable(),
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
			icon: iconValidator,
			geo: geoValidator,
			arrowheadStart: arrowheadValidator,
			arrowheadEnd: arrowheadValidator,
			spline: splineValidator,
		}),
		cursor: cursorValidator,
		scribble: scribbleTypeValidator.nullable(),
		isFocusMode: T.boolean,
		isDebugMode: T.boolean,
		isToolLocked: T.boolean,
		exportBackground: T.boolean,
		screenBounds: T.boxModel,
		zoomBrush: T.boxModel.nullable(),
	})
)

// --- MIGRATIONS ---
// STEP 1: Add a new version number here, give it a meaningful name.
// It should be 1 higher than the current version
const Versions = {
	Initial: 0,
	AddTransparentExportBgs: 1,
	RemoveDialog: 2,
	AddToolLockMode: 3,
	RemoveExtraPropsForNextShape: 4,
	AddLabelColor: 5,
	AddFollowingUserId: 6,
	RemoveAlignJustify: 7,
	AddZoom: 8,
	AddScribbleDelay: 9,
} as const

/** @public */
export const instanceTypeMigrations = defineMigrations({
	firstVersion: Versions.Initial,
	// STEP 2: Update the current version to point to your latest version
	currentVersion: Versions.AddScribbleDelay,
	// STEP 3: Add an up+down migration for the new version here
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
export const TLInstance = createRecordType<TLInstance>('instance', {
	migrations: instanceTypeMigrations,
	validator: instanceTypeValidator,
	scope: 'instance',
}).withDefaultProperties(
	(): Omit<TLInstance, 'typeName' | 'id' | 'userId' | 'currentPageId'> => ({
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
