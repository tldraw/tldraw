import { defineMigrations, SerializedStore } from '@tldraw/store'
import { deepCopy } from '@tldraw/utils'
import { T } from '@tldraw/validate'
import { bookmarkAssetMigrations } from '../assets/TLBookmarkAsset'
import { imageAssetMigrations } from '../assets/TLImageAsset'
import { videoAssetMigrations } from '../assets/TLVideoAsset'
import { CameraRecordType } from '../records/TLCamera'
import { TLDocument } from '../records/TLDocument'
import { TLInstance, TLINSTANCE_ID } from '../records/TLInstance'
import { TLRecord } from '../records/TLRecord'
import { TLArrowShapeTerminal } from '../shapes/TLArrowShape'
import { TLBookmarkShape } from '../shapes/TLBookmarkShape'
import { EMBED_DEFINITIONS, EmbedDefinition } from '../shapes/TLEmbedShape'
import { TLDefaultHorizontalAlignStyle } from '../styles/TLHorizontalAlignStyle'

/** @internal */
export const storeVersions = {
	RemoveCodeAndIconShapeTypes: 1,
	AddInstancePresenceType: 2,
	RemoveTLUserAndPresenceAndAddPointer: 3,
	RemoveUserDocument: 4,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const storeMigrations = defineMigrations({
	currentVersion: storeVersions.RemoveUserDocument,
	migrators: {
		[storeVersions.RemoveCodeAndIconShapeTypes]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(
						([_, v]) => v.typeName !== 'shape' || (v.type !== 'icon' && v.type !== 'code')
					)
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				// noop
				return store
			},
		},
		[storeVersions.AddInstancePresenceType]: {
			up: (store: SerializedStore<TLRecord>) => {
				return store
			},
			down: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'instance_presence')
				)
			},
		},
		[storeVersions.RemoveTLUserAndPresenceAndAddPointer]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !v.typeName.match(/^(user|user_presence)$/))
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => v.typeName !== 'pointer')
				)
			},
		},
		[storeVersions.RemoveUserDocument]: {
			up: (store: SerializedStore<TLRecord>) => {
				return Object.fromEntries(
					Object.entries(store).filter(([_, v]) => !v.typeName.match('user_document'))
				)
			},
			down: (store: SerializedStore<TLRecord>) => {
				return store
			},
		},
	},
})

/** @internal */
export const assetVersions = {
	AddMeta: 1,
}

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const assetMigrations = defineMigrations({
	subTypeKey: 'type',
	subTypeMigrations: {
		image: imageAssetMigrations,
		video: videoAssetMigrations,
		bookmark: bookmarkAssetMigrations,
	},
	currentVersion: assetVersions.AddMeta,
	migrators: {
		[assetVersions.AddMeta]: {
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
	},
})

/** @internal */
export const cameraVersions = {
	AddMeta: 1,
}

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const cameraMigrations = defineMigrations({
	currentVersion: cameraVersions.AddMeta,
	migrators: {
		[cameraVersions.AddMeta]: {
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
	},
})

/** @internal */
export const documentVersions = {
	AddName: 1,
	AddMeta: 2,
} as const

// eslint-disable-next-line deprecation/deprecation
/** @internal */
export const documentMigrations = defineMigrations({
	currentVersion: documentVersions.AddMeta,
	migrators: {
		[documentVersions.AddName]: {
			up: (document: TLDocument) => {
				return { ...document, name: '' }
			},
			down: ({ name: _, ...document }: TLDocument) => {
				return document
			},
		},
		[documentVersions.AddMeta]: {
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
	},
})

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
	AddScribbles: 22,
	AddInset: 23,
	AddDuplicateProps: 24,
} as const

/** @public */
// eslint-disable-next-line deprecation/deprecation
export const instanceMigrations = defineMigrations({
	currentVersion: instanceVersions.AddDuplicateProps,
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
		[instanceVersions.AddScribbles]: {
			up: ({ scribble: _, ...record }) => {
				return {
					...record,
					scribbles: [],
				}
			},
			down: ({ scribbles: _, ...record }) => {
				return { ...record, scribble: null }
			},
		},
		[instanceVersions.AddInset]: {
			up: (record) => {
				return {
					...record,
					insets: [false, false, false, false],
				}
			},
			down: ({ insets: _, ...record }) => {
				return {
					...record,
				}
			},
		},
		[instanceVersions.AddDuplicateProps]: {
			up: (record) => {
				return {
					...record,
					duplicateProps: null,
				}
			},
			down: ({ duplicateProps: _, ...record }) => {
				return {
					...record,
				}
			},
		},
	},
})

/** @internal */
export const pageVersions = {
	AddMeta: 1,
}

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const pageMigrations = defineMigrations({
	currentVersion: pageVersions.AddMeta,
	migrators: {
		[pageVersions.AddMeta]: {
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
	},
})

/** @internal */
export const instancePageStateVersions = {
	AddCroppingId: 1,
	RemoveInstanceIdAndCameraId: 2,
	AddMeta: 3,
	RenameProperties: 4,
	RenamePropertiesAgain: 5,
} as const

/** @public */
// eslint-disable-next-line deprecation/deprecation
export const instancePageStateMigrations = defineMigrations({
	currentVersion: instancePageStateVersions.RenamePropertiesAgain,
	migrators: {
		[instancePageStateVersions.AddCroppingId]: {
			up(instance) {
				return { ...instance, croppingShapeId: null }
			},
			down({ croppingShapeId: _croppingShapeId, ...instance }) {
				return instance
			},
		},
		[instancePageStateVersions.RemoveInstanceIdAndCameraId]: {
			up({ instanceId: _, cameraId: __, ...instance }) {
				return instance
			},
			down(instance) {
				// this should never be called since we bump the schema version
				return {
					...instance,
					instanceId: TLINSTANCE_ID,
					cameraId: CameraRecordType.createId('void'),
				}
			},
		},
		[instancePageStateVersions.AddMeta]: {
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
		[instancePageStateVersions.RenameProperties]: {
			// this migration is cursed: it was written wrong and doesn't do anything.
			// rather than replace it, I've added another migration below that fixes it.
			up: (record) => {
				const {
					selectedShapeIds,
					hintingShapeIds,
					erasingShapeIds,
					hoveredShapeId,
					editingShapeId,
					croppingShapeId,
					focusedGroupId,
					...rest
				} = record
				return {
					selectedShapeIds: selectedShapeIds,
					hintingShapeIds: hintingShapeIds,
					erasingShapeIds: erasingShapeIds,
					hoveredShapeId: hoveredShapeId,
					editingShapeId: editingShapeId,
					croppingShapeId: croppingShapeId,
					focusedGroupId: focusedGroupId,
					...rest,
				}
			},
			down: (record) => {
				const {
					selectedShapeIds,
					hintingShapeIds,
					erasingShapeIds,
					hoveredShapeId,
					editingShapeId,
					croppingShapeId,
					focusedGroupId,
					...rest
				} = record
				return {
					selectedShapeIds: selectedShapeIds,
					hintingShapeIds: hintingShapeIds,
					erasingShapeIds: erasingShapeIds,
					hoveredShapeId: hoveredShapeId,
					editingShapeId: editingShapeId,
					croppingShapeId: croppingShapeId,
					focusedGroupId: focusedGroupId,
					...rest,
				}
			},
		},
		[instancePageStateVersions.RenamePropertiesAgain]: {
			up: (record) => {
				const {
					selectedIds,
					hintingIds,
					erasingIds,
					hoveredId,
					editingId,
					croppingShapeId,
					croppingId,
					focusLayerId,
					...rest
				} = record
				return {
					...rest,
					selectedShapeIds: selectedIds,
					hintingShapeIds: hintingIds,
					erasingShapeIds: erasingIds,
					hoveredShapeId: hoveredId,
					editingShapeId: editingId,
					croppingShapeId: croppingShapeId ?? croppingId ?? null,
					focusedGroupId: focusLayerId,
				}
			},
			down: (record) => {
				const {
					selectedShapeIds,
					hintingShapeIds,
					erasingShapeIds,
					hoveredShapeId,
					editingShapeId,
					croppingShapeId,
					focusedGroupId,
					...rest
				} = record
				return {
					...rest,
					selectedIds: selectedShapeIds,
					hintingIds: hintingShapeIds,
					erasingIds: erasingShapeIds,
					hoveredId: hoveredShapeId,
					editingId: editingShapeId,
					croppingId: croppingShapeId,
					focusLayerId: focusedGroupId,
				}
			},
		},
	},
})

/** @internal */
export const pointerVersions = {
	AddMeta: 1,
}

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const pointerMigrations = defineMigrations({
	currentVersion: pointerVersions.AddMeta,
	migrators: {
		[pointerVersions.AddMeta]: {
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
	},
})

/** @internal */
export const instancePresenceVersions = {
	AddScribbleDelay: 1,
	RemoveInstanceId: 2,
	AddChatMessage: 3,
	AddMeta: 4,
	RenameSelectedShapeIds: 5,
} as const

// eslint-disable-next-line deprecation/deprecation
export const instancePresenceMigrations = defineMigrations({
	currentVersion: instancePresenceVersions.RenameSelectedShapeIds,
	migrators: {
		[instancePresenceVersions.AddScribbleDelay]: {
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
		[instancePresenceVersions.RemoveInstanceId]: {
			up: ({ instanceId: _, ...instance }) => {
				return instance
			},
			down: (instance) => {
				return { ...instance, instanceId: TLINSTANCE_ID }
			},
		},
		[instancePresenceVersions.AddChatMessage]: {
			up: (instance) => {
				return { ...instance, chatMessage: '' }
			},
			down: ({ chatMessage: _, ...instance }) => {
				return instance
			},
		},
		[instancePresenceVersions.AddMeta]: {
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
		[instancePresenceVersions.RenameSelectedShapeIds]: {
			up: (record) => {
				const { selectedShapeIds, ...rest } = record
				return {
					selectedShapeIds: selectedShapeIds,
					...rest,
				}
			},
			down: (record) => {
				const { selectedShapeIds, ...rest } = record
				return {
					selectedShapeIds: selectedShapeIds,
					...rest,
				}
			},
		},
	},
})

/** @internal */
export const rootShapeVersions = {
	AddIsLocked: 1,
	HoistOpacity: 2,
	AddMeta: 3,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const rootShapeMigrations = defineMigrations({
	currentVersion: rootShapeVersions.AddMeta,
	migrators: {
		[rootShapeVersions.AddIsLocked]: {
			up: (record) => {
				return {
					...record,
					isLocked: false,
				}
			},
			down: (record) => {
				const { isLocked: _, ...rest } = record
				return {
					...rest,
				}
			},
		},
		[rootShapeVersions.HoistOpacity]: {
			up: ({ props: { opacity, ...props }, ...record }) => {
				return {
					...record,
					opacity: Number(opacity ?? '1'),
					props,
				}
			},
			down: ({ opacity, ...record }) => {
				return {
					...record,
					props: {
						...record.props,
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
		[rootShapeVersions.AddMeta]: {
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
	},
})

/** @internal */
const imageShapeVersions = {
	AddUrlProp: 1,
	AddCropProp: 2,
	MakeUrlsValid: 3,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const imageShapeMigrations = defineMigrations({
	currentVersion: imageShapeVersions.MakeUrlsValid,
	migrators: {
		[imageShapeVersions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
		[imageShapeVersions.AddCropProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, crop: null } }
			},
			down: (shape) => {
				const { crop: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
		[imageShapeVersions.MakeUrlsValid]: {
			up: (shape) => {
				const url = shape.props.url
				if (url !== '' && !T.linkUrl.isValid(shape.props.url)) {
					return { ...shape, props: { ...shape.props, url: '' } }
				}
				return shape
			},
			down: (shape) => shape,
		},
	},
})

/** @internal */
export const ArrowMigrationVersions = {
	AddLabelColor: 1,
	AddIsPrecise: 2,
	AddLabelPosition: 3,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const arrowShapeMigrations = defineMigrations({
	currentVersion: ArrowMigrationVersions.AddLabelPosition,
	migrators: {
		[ArrowMigrationVersions.AddLabelColor]: {
			up: (record) => {
				return {
					...record,
					props: {
						...record.props,
						labelColor: 'black',
					},
				}
			},
			down: (record) => {
				const { labelColor: _, ...props } = record.props
				return {
					...record,
					props,
				}
			},
		},

		[ArrowMigrationVersions.AddIsPrecise]: {
			up: (record) => {
				const { start, end } = record.props
				return {
					...record,
					props: {
						...record.props,
						start:
							(start as TLArrowShapeTerminal).type === 'binding'
								? {
										...start,
										isPrecise: !(
											start.normalizedAnchor.x === 0.5 && start.normalizedAnchor.y === 0.5
										),
									}
								: start,
						end:
							(end as TLArrowShapeTerminal).type === 'binding'
								? {
										...end,
										isPrecise: !(end.normalizedAnchor.x === 0.5 && end.normalizedAnchor.y === 0.5),
									}
								: end,
					},
				}
			},
			down: (record: any) => {
				const { start, end } = record.props
				const nStart = { ...start }
				const nEnd = { ...end }
				if (nStart.type === 'binding') {
					if (!nStart.isPrecise) {
						nStart.normalizedAnchor = { x: 0.5, y: 0.5 }
					}
					delete nStart.isPrecise
				}
				if (nEnd.type === 'binding') {
					if (!nEnd.isPrecise) {
						nEnd.normalizedAnchor = { x: 0.5, y: 0.5 }
					}
					delete nEnd.isPrecise
				}
				return {
					...record,
					props: {
						...record.props,
						start: nStart,
						end: nEnd,
					},
				}
			},
		},

		[ArrowMigrationVersions.AddLabelPosition]: {
			up: (record) => {
				return {
					...record,
					props: {
						...record.props,
						labelPosition: 0.5,
					},
				}
			},
			down: (record) => {
				const { labelPosition: _, ...props } = record.props
				return {
					...record,
					props,
				}
			},
		},
	},
})

/** @internal */
export const bookmarkShapeVersions = {
	NullAssetId: 1,
	MakeUrlsValid: 2,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const bookmarkShapeMigrations = defineMigrations({
	currentVersion: bookmarkShapeVersions.MakeUrlsValid,
	migrators: {
		[bookmarkShapeVersions.NullAssetId]: {
			up: (shape: TLBookmarkShape) => {
				if (shape.props.assetId === undefined) {
					return { ...shape, props: { ...shape.props, assetId: null } } as typeof shape
				}
				return shape
			},
			down: (shape: TLBookmarkShape) => {
				if (shape.props.assetId === null) {
					const { assetId: _, ...props } = shape.props
					return { ...shape, props } as typeof shape
				}
				return shape
			},
		},
		[bookmarkShapeVersions.MakeUrlsValid]: {
			up: (shape) => {
				const url = shape.props.url
				if (url !== '' && !T.linkUrl.isValid(shape.props.url)) {
					return { ...shape, props: { ...shape.props, url: '' } }
				}
				return shape
			},
			down: (shape) => shape,
		},
	},
})

/** @internal */
export const drawShapeVersions = {
	AddInPen: 1,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const drawShapeMigrations = defineMigrations({
	currentVersion: drawShapeVersions.AddInPen,
	migrators: {
		[drawShapeVersions.AddInPen]: {
			up: (shape) => {
				// Rather than checking to see whether the shape is a pen at runtime,
				// from now on we're going to use the type of device reported to us
				// as well as the pressure data received; but for existing shapes we
				// need to check the pressure data to see if it's a pen or not.
				const { points } = shape.props.segments[0]

				if (points.length === 0) {
					return {
						...shape,
						props: {
							...shape.props,
							isPen: false,
						},
					}
				}

				let isPen = !(points[0].z === 0 || points[0].z === 0.5)

				if (points[1]) {
					// Double check if we have a second point (we probably should)
					isPen = isPen && !(points[1].z === 0 || points[1].z === 0.5)
				}

				return {
					...shape,
					props: {
						...shape.props,
						isPen,
					},
				}
			},
			down: (shape) => {
				const { isPen: _isPen, ...propsWithOutIsPen } = shape.props
				return {
					...shape,
					props: {
						...propsWithOutIsPen,
					},
				}
			},
		},
	},
})

/** @internal */
export const embedShapeVersions = {
	GenOriginalUrlInEmbed: 1,
	RemoveDoesResize: 2,
	RemoveTmpOldUrl: 3,
	RemovePermissionOverrides: 4,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const embedShapeMigrations = defineMigrations({
	currentVersion: embedShapeVersions.RemovePermissionOverrides,
	migrators: {
		[embedShapeVersions.GenOriginalUrlInEmbed]: {
			// add tmpOldUrl property
			up: (shape) => {
				const url = shape.props.url
				const host = new URL(url).host.replace('www.', '')
				let originalUrl
				for (const localEmbedDef of EMBED_DEFINITIONS) {
					if ((localEmbedDef as EmbedDefinition).hostnames.includes(host)) {
						try {
							originalUrl = localEmbedDef.fromEmbedUrl(url)
						} catch (err) {
							console.warn(err)
						}
					}
				}

				return {
					...shape,
					props: {
						...shape.props,
						tmpOldUrl: shape.props.url,
						url: originalUrl ?? '',
					},
				}
			},
			// remove tmpOldUrl property
			down: (shape) => {
				let newUrl = shape.props.tmpOldUrl
				if (!newUrl || newUrl === '') {
					const url = shape.props.url
					const host = new URL(url).host.replace('www.', '')

					for (const localEmbedDef of EMBED_DEFINITIONS) {
						if ((localEmbedDef as EmbedDefinition).hostnames.includes(host)) {
							try {
								newUrl = localEmbedDef.toEmbedUrl(url)
							} catch (err) {
								console.warn(err)
							}
						}
					}
				}

				// eslint-disable-next-line @typescript-eslint/no-unused-vars
				const { tmpOldUrl, ...props } = shape.props
				return {
					...shape,
					props: {
						...props,
						url: newUrl ?? '',
					},
				}
			},
		},
		[embedShapeVersions.RemoveDoesResize]: {
			up: (shape) => {
				const { doesResize: _, ...props } = shape.props
				return {
					...shape,
					props: {
						...props,
					},
				}
			},
			down: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						doesResize: true,
					},
				}
			},
		},
		[embedShapeVersions.RemoveTmpOldUrl]: {
			up: (shape) => {
				const { tmpOldUrl: _, ...props } = shape.props
				return {
					...shape,
					props: {
						...props,
					},
				}
			},
			down: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
					},
				}
			},
		},
		[embedShapeVersions.RemovePermissionOverrides]: {
			up: (shape) => {
				const { overridePermissions: _, ...props } = shape.props
				return {
					...shape,
					props: {
						...props,
					},
				}
			},
			down: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
					},
				}
			},
		},
	},
})

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const frameShapeMigrations = defineMigrations({})

/** @internal */
export const geoShapeVersions = {
	AddUrlProp: 1,
	AddLabelColor: 2,
	RemoveJustify: 3,
	AddCheckBox: 4,
	AddVerticalAlign: 5,
	MigrateLegacyAlign: 6,
	AddCloud: 7,
	MakeUrlsValid: 8,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const geoShapeMigrations = defineMigrations({
	currentVersion: geoShapeVersions.MakeUrlsValid,
	migrators: {
		[geoShapeVersions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
		[geoShapeVersions.AddLabelColor]: {
			up: (record) => {
				return {
					...record,
					props: {
						...record.props,
						labelColor: 'black',
					},
				}
			},
			down: (record) => {
				const { labelColor: _, ...props } = record.props
				return {
					...record,
					props,
				}
			},
		},
		[geoShapeVersions.RemoveJustify]: {
			up: (shape) => {
				let newAlign = shape.props.align
				if (newAlign === 'justify') {
					newAlign = 'start'
				}

				return {
					...shape,
					props: {
						...shape.props,
						align: newAlign,
					},
				}
			},
			down: (shape) => {
				return { ...shape }
			},
		},
		[geoShapeVersions.AddCheckBox]: {
			up: (shape) => {
				return { ...shape }
			},
			down: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						geo: shape.props.geo === 'check-box' ? 'rectangle' : shape.props.geo,
					},
				}
			},
		},
		[geoShapeVersions.AddVerticalAlign]: {
			up: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						verticalAlign: 'middle',
					},
				}
			},
			down: (shape) => {
				const { verticalAlign: _, ...props } = shape.props
				return {
					...shape,
					props,
				}
			},
		},
		[geoShapeVersions.MigrateLegacyAlign]: {
			up: (shape) => {
				let newAlign: TLDefaultHorizontalAlignStyle
				switch (shape.props.align) {
					case 'start':
						newAlign = 'start-legacy'
						break
					case 'end':
						newAlign = 'end-legacy'
						break
					default:
						newAlign = 'middle-legacy'
						break
				}
				return {
					...shape,
					props: {
						...shape.props,
						align: newAlign,
					},
				}
			},
			down: (shape) => {
				let oldAlign: TLDefaultHorizontalAlignStyle
				switch (shape.props.align) {
					case 'start-legacy':
						oldAlign = 'start'
						break
					case 'end-legacy':
						oldAlign = 'end'
						break
					case 'middle-legacy':
						oldAlign = 'middle'
						break
					default:
						oldAlign = shape.props.align
				}
				return {
					...shape,
					props: {
						...shape.props,
						align: oldAlign,
					},
				}
			},
		},
		[geoShapeVersions.AddCloud]: {
			up: (shape) => {
				return shape
			},
			down: (shape) => {
				if (shape.props.geo === 'cloud') {
					return {
						...shape,
						props: {
							...shape.props,
							geo: 'rectangle',
						},
					}
				}
			},
		},
		[geoShapeVersions.MakeUrlsValid]: {
			up: (shape) => {
				const url = shape.props.url
				if (url !== '' && !T.linkUrl.isValid(shape.props.url)) {
					return { ...shape, props: { ...shape.props, url: '' } }
				}
				return shape
			},
			down: (shape) => shape,
		},
	},
})

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const groupShapeMigrations = defineMigrations({})

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const highlightShapeMigrations = defineMigrations({})

/** @internal */
export const lineShapeVersions = {
	AddSnapHandles: 1,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const lineShapeMigrations = defineMigrations({
	currentVersion: lineShapeVersions.AddSnapHandles,
	migrators: {
		[lineShapeVersions.AddSnapHandles]: {
			up: (record: any) => {
				const handles = deepCopy(record.props.handles as Record<string, any>)
				for (const id in handles) {
					handles[id].canSnap = true
				}
				return { ...record, props: { ...record.props, handles } }
			},
			down: (record: any) => {
				const handles = deepCopy(record.props.handles as Record<string, any>)
				for (const id in handles) {
					delete handles[id].canSnap
				}
				return { ...record, props: { ...record.props, handles } }
			},
		},
	},
})

/** @internal */
export const noteShapeVersions = {
	AddUrlProp: 1,
	RemoveJustify: 2,
	MigrateLegacyAlign: 3,
	AddVerticalAlign: 4,
	MakeUrlsValid: 5,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const noteShapeMigrations = defineMigrations({
	currentVersion: noteShapeVersions.MakeUrlsValid,
	migrators: {
		[noteShapeVersions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
		[noteShapeVersions.RemoveJustify]: {
			up: (shape) => {
				let newAlign = shape.props.align
				if (newAlign === 'justify') {
					newAlign = 'start'
				}

				return {
					...shape,
					props: {
						...shape.props,
						align: newAlign,
					},
				}
			},
			down: (shape) => {
				return { ...shape }
			},
		},

		[noteShapeVersions.MigrateLegacyAlign]: {
			up: (shape) => {
				let newAlign: TLDefaultHorizontalAlignStyle
				switch (shape.props.align) {
					case 'start':
						newAlign = 'start-legacy'
						break
					case 'end':
						newAlign = 'end-legacy'
						break
					default:
						newAlign = 'middle-legacy'
						break
				}
				return {
					...shape,
					props: {
						...shape.props,
						align: newAlign,
					},
				}
			},
			down: (shape) => {
				let oldAlign: TLDefaultHorizontalAlignStyle
				switch (shape.props.align) {
					case 'start-legacy':
						oldAlign = 'start'
						break
					case 'end-legacy':
						oldAlign = 'end'
						break
					case 'middle-legacy':
						oldAlign = 'middle'
						break
					default:
						oldAlign = shape.props.align
				}
				return {
					...shape,
					props: {
						...shape.props,
						align: oldAlign,
					},
				}
			},
		},
		[noteShapeVersions.AddVerticalAlign]: {
			up: (shape) => {
				return {
					...shape,
					props: {
						...shape.props,
						verticalAlign: 'middle',
					},
				}
			},
			down: (shape) => {
				const { verticalAlign: _, ...props } = shape.props

				return {
					...shape,
					props,
				}
			},
		},
		[noteShapeVersions.MakeUrlsValid]: {
			up: (shape) => {
				const url = shape.props.url
				if (url !== '' && !T.linkUrl.isValid(shape.props.url)) {
					return { ...shape, props: { ...shape.props, url: '' } }
				}
				return shape
			},
			down: (shape) => shape,
		},
	},
})

/** @internal */
export const textShapeVersions = {
	RemoveJustify: 1,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const textShapeMigrations = defineMigrations({
	currentVersion: textShapeVersions.RemoveJustify,
	migrators: {
		[textShapeVersions.RemoveJustify]: {
			up: (shape) => {
				let newAlign = shape.props.align
				if (newAlign === 'justify') {
					newAlign = 'start'
				}

				return {
					...shape,
					props: {
						...shape.props,
						align: newAlign,
					},
				}
			},
			down: (shape) => {
				return { ...shape }
			},
		},
	},
})

/** @internal */
export const videoShapeVersions = {
	AddUrlProp: 1,
	MakeUrlsValid: 2,
} as const

/** @internal */
// eslint-disable-next-line deprecation/deprecation
export const videoShapeMigrations = defineMigrations({
	currentVersion: videoShapeVersions.MakeUrlsValid,
	migrators: {
		[videoShapeVersions.AddUrlProp]: {
			up: (shape) => {
				return { ...shape, props: { ...shape.props, url: '' } }
			},
			down: (shape) => {
				const { url: _, ...props } = shape.props
				return { ...shape, props }
			},
		},
		[videoShapeVersions.MakeUrlsValid]: {
			up: (shape) => {
				const url = shape.props.url
				if (url !== '' && !T.linkUrl.isValid(shape.props.url)) {
					return { ...shape, props: { ...shape.props, url: '' } }
				}
				return shape
			},
			down: (shape) => shape,
		},
	},
})
