import { defineMigrations, SerializedStore } from '@tldraw/store'
import { bookmarkAssetMigrations } from '../assets/TLBookmarkAsset'
import { imageAssetMigrations } from '../assets/TLImageAsset'
import { videoAssetMigrations } from '../assets/TLVideoAsset'
import { CameraRecordType } from '../records/TLCamera'
import { TLDocument } from '../records/TLDocument'
import { TLInstance, TLINSTANCE_ID } from '../records/TLInstance'
import { TLRecord } from '../records/TLRecord'

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
