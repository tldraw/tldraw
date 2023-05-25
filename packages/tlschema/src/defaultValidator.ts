import { T } from '@tldraw/tlvalidate'
import { TLBookmarkAsset } from './assets/TLBookmarkAsset'
import { TLImageAsset } from './assets/TLImageAsset'
import { TLVideoAsset } from './assets/TLVideoAsset'
import { createAssetValidator } from './assets/asset-validation'
import { TLCamera, TLCameraId } from './records/TLCamera'
import { TLDocument } from './records/TLDocument'
import { TLInstance, TLInstanceId } from './records/TLInstance'
import { TLInstancePageState, TLInstancePageStateId } from './records/TLInstancePageState'
import { TLInstancePresence, TLInstancePresenceId } from './records/TLInstancePresence'
import { TLPage, TLPageId } from './records/TLPage'
import { TLShapeId } from './records/TLShape'
import { TLUser } from './records/TLUser'
import { TLUserDocument, TLUserDocumentId } from './records/TLUserDocument'
import { TLUserPresence, TLUserPresenceId } from './records/TLUserPresence'
import { TLArrowShape, arrowTerminalTypeValidator } from './shapes/TLArrowShape'
import { TLBookmarkShape } from './shapes/TLBookmarkShape'
import { TLDrawShape, TL_DRAW_SHAPE_SEGMENT_TYPE } from './shapes/TLDrawShape'
import { TLEmbedShape, tlEmbedShapePermissionDefaults } from './shapes/TLEmbedShape'
import { TLFrameShape } from './shapes/TLFrameShape'
import { TLGeoShape } from './shapes/TLGeoShape'
import { TLGroupShape } from './shapes/TLGroupShape'
import { TLIconShape } from './shapes/TLIconShape'
import { TLImageShape } from './shapes/TLImageShape'
import { TLLineShape } from './shapes/TLLineShape'
import { TLNoteShape } from './shapes/TLNoteShape'
import { TLTextShape } from './shapes/TLTextShape'
import { TLVideoShape } from './shapes/TLVideoShape'
import { createShapeValidator } from './shapes/shape-validation'
import {
	TLScribble,
	TL_SCRIBBLE_STATES,
	cursorTypeValidator,
	cursorValidator,
	handleTypeValidator,
	uiColorTypeValidator,
} from './ui-types'
import {
	alignValidator,
	arrowheadValidator,
	assetIdValidator,
	colorValidator,
	dashValidator,
	fillValidator,
	fontValidator,
	geoValidator,
	iconValidator,
	idValidator,
	instanceIdValidator,
	opacityValidator,
	pageIdValidator,
	shapeIdValidator,
	sizeValidator,
	splineValidator,
	userIdValidator,
	verticalAlignValidator,
} from './validation'

/** @public */
export const defaultValidator = T.union('typeName', {
	asset: T.model(
		'asset',
		T.union('type', {
			image: createAssetValidator<TLImageAsset>(
				'image',
				T.object({
					w: T.number,
					h: T.number,
					name: T.string,
					isAnimated: T.boolean,
					mimeType: T.string.nullable(),
					src: T.string.nullable(),
				})
			),
			video: createAssetValidator<TLVideoAsset>(
				'video',
				T.object({
					w: T.number,
					h: T.number,
					name: T.string,
					isAnimated: T.boolean,
					mimeType: T.string.nullable(),
					src: T.string.nullable(),
				})
			),
			bookmark: createAssetValidator<TLBookmarkAsset>(
				'bookmark',
				T.object({
					title: T.string,
					description: T.string,
					image: T.string,
					src: T.string.nullable(),
				})
			),
		})
	),
	camera: T.model<TLCamera>(
		'camera',
		T.object({
			typeName: T.literal('camera'),
			id: idValidator<TLCameraId>('camera'),
			x: T.number,
			y: T.number,
			z: T.number,
		})
	),
	document: T.model<TLDocument>(
		'document',
		T.object({
			typeName: T.literal('document'),
			id: T.literal('document:document' as TLDocument['id']),
			gridSize: T.number,
		})
	),
	instance: T.model<TLInstance>(
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
				verticalAlign: verticalAlignValidator,
				icon: iconValidator,
				geo: geoValidator,
				arrowheadStart: arrowheadValidator,
				arrowheadEnd: arrowheadValidator,
				spline: splineValidator,
			}),
			cursor: cursorValidator,
			scribble: T.object({
				points: T.arrayOf(T.point),
				size: T.positiveNumber,
				color: uiColorTypeValidator,
				opacity: T.number,
				state: T.setEnum(TL_SCRIBBLE_STATES),
				delay: T.number,
			}).nullable(),
			isFocusMode: T.boolean,
			isDebugMode: T.boolean,
			isToolLocked: T.boolean,
			exportBackground: T.boolean,
			screenBounds: T.boxModel,
			zoomBrush: T.boxModel.nullable(),
		})
	),
	instance_page_state: T.model<TLInstancePageState>(
		'instance_page_state',
		T.object({
			typeName: T.literal('instance_page_state'),
			id: idValidator<TLInstancePageStateId>('instance_page_state'),
			instanceId: instanceIdValidator,
			pageId: pageIdValidator,
			cameraId: idValidator<TLCameraId>('camera'),
			selectedIds: T.arrayOf(shapeIdValidator),
			hintingIds: T.arrayOf(shapeIdValidator),
			erasingIds: T.arrayOf(shapeIdValidator),
			hoveredId: shapeIdValidator.nullable(),
			editingId: shapeIdValidator.nullable(),
			croppingId: shapeIdValidator.nullable(),
			focusLayerId: shapeIdValidator.nullable(),
		})
	),
	page: T.model<TLPage>(
		'page',
		T.object({
			typeName: T.literal('page'),
			id: pageIdValidator,
			name: T.string,
			index: T.string,
		})
	),
	shape: T.model(
		'shape',
		T.union('type', {
			arrow: createShapeValidator<TLArrowShape>(
				'arrow',
				T.object({
					labelColor: colorValidator,
					color: colorValidator,
					fill: fillValidator,
					dash: dashValidator,
					size: sizeValidator,
					opacity: opacityValidator,
					arrowheadStart: arrowheadValidator,
					arrowheadEnd: arrowheadValidator,
					font: fontValidator,
					start: arrowTerminalTypeValidator,
					end: arrowTerminalTypeValidator,
					bend: T.number,
					text: T.string,
				})
			),
			bookmark: createShapeValidator<TLBookmarkShape>(
				'bookmark',
				T.object({
					opacity: opacityValidator,
					w: T.nonZeroNumber,
					h: T.nonZeroNumber,
					assetId: assetIdValidator.nullable(),
					url: T.string,
				})
			),
			draw: createShapeValidator<TLDrawShape>(
				'draw',
				T.object({
					color: colorValidator,
					fill: fillValidator,
					dash: dashValidator,
					size: sizeValidator,
					opacity: opacityValidator,
					segments: T.arrayOf(
						T.object({
							type: T.setEnum(TL_DRAW_SHAPE_SEGMENT_TYPE),
							points: T.arrayOf(T.point),
						})
					),
					isComplete: T.boolean,
					isClosed: T.boolean,
					isPen: T.boolean,
				})
			),
			embed: createShapeValidator<TLEmbedShape>(
				'embed',
				T.object({
					opacity: opacityValidator,
					w: T.nonZeroNumber,
					h: T.nonZeroNumber,
					url: T.string,
					tmpOldUrl: T.string.optional(),
					doesResize: T.boolean,
					overridePermissions: T.dict(
						T.setEnum(new Set(Object.keys(tlEmbedShapePermissionDefaults))),
						T.boolean.optional()
					).optional(),
				})
			),
			frame: createShapeValidator<TLFrameShape>(
				'frame',
				T.object({
					opacity: opacityValidator,
					w: T.nonZeroNumber,
					h: T.nonZeroNumber,
					name: T.string,
				})
			),
			geo: createShapeValidator<TLGeoShape>(
				'geo',
				T.object({
					geo: geoValidator,
					labelColor: colorValidator,
					color: colorValidator,
					fill: fillValidator,
					dash: dashValidator,
					size: sizeValidator,
					opacity: opacityValidator,
					font: fontValidator,
					align: alignValidator,
					verticalAlign: verticalAlignValidator,
					url: T.string,
					w: T.nonZeroNumber,
					h: T.nonZeroNumber,
					growY: T.positiveNumber,
					text: T.string,
				})
			),
			group: createShapeValidator<TLGroupShape>(
				'group',
				T.object({
					opacity: opacityValidator,
				})
			),
			image: createShapeValidator<TLImageShape>(
				'image',
				T.object({
					opacity: opacityValidator,
					w: T.nonZeroNumber,
					h: T.nonZeroNumber,
					playing: T.boolean,
					url: T.string,
					assetId: assetIdValidator.nullable(),
					crop: T.object({
						topLeft: T.point,
						bottomRight: T.point,
					}).nullable(),
				})
			),
			line: createShapeValidator<TLLineShape>(
				'line',
				T.object({
					color: colorValidator,
					dash: dashValidator,
					size: sizeValidator,
					opacity: opacityValidator,
					spline: splineValidator,
					handles: T.dict(T.string, handleTypeValidator),
				})
			),
			note: createShapeValidator<TLNoteShape>(
				'note',
				T.object({
					color: colorValidator,
					size: sizeValidator,
					font: fontValidator,
					align: alignValidator,
					opacity: opacityValidator,
					growY: T.positiveNumber,
					url: T.string,
					text: T.string,
				})
			),
			text: createShapeValidator<TLTextShape>(
				'text',
				T.object({
					color: colorValidator,
					size: sizeValidator,
					font: fontValidator,
					align: alignValidator,
					opacity: opacityValidator,
					w: T.nonZeroNumber,
					text: T.string,
					scale: T.nonZeroNumber,
					autoSize: T.boolean,
				})
			),
			video: createShapeValidator<TLVideoShape>(
				'video',
				T.object({
					opacity: opacityValidator,
					w: T.nonZeroNumber,
					h: T.nonZeroNumber,
					time: T.number,
					playing: T.boolean,
					url: T.string,
					assetId: assetIdValidator.nullable(),
				})
			),
			icon: createShapeValidator<TLIconShape>(
				'icon',
				T.object({
					size: sizeValidator,
					icon: iconValidator,
					dash: dashValidator,
					color: colorValidator,
					opacity: opacityValidator,
					scale: T.number,
				})
			),
		})
	),
	user: T.model<TLUser>(
		'user',
		T.object({
			typeName: T.literal('user'),
			id: userIdValidator,
			name: T.string,
			locale: T.string,
		})
	),
	user_document: T.model<TLUserDocument>(
		'user_document',
		T.object({
			typeName: T.literal('user_document'),
			id: idValidator<TLUserDocumentId>('user_document'),
			userId: userIdValidator,
			isPenMode: T.boolean,
			isGridMode: T.boolean,
			isDarkMode: T.boolean,
			isMobileMode: T.boolean,
			isSnapMode: T.boolean,
			lastUpdatedPageId: pageIdValidator.nullable(),
			lastUsedTabId: instanceIdValidator.nullable(),
		})
	),
	user_presence: T.model<TLUserPresence>(
		'user_presence',
		T.object({
			typeName: T.literal('user_presence'),
			id: idValidator<TLUserPresenceId>('user_presence'),
			userId: userIdValidator,
			lastUsedInstanceId: instanceIdValidator.nullable(),
			lastActivityTimestamp: T.number,
			cursor: T.point,
			viewportPageBounds: T.boxModel,
			color: T.string,
		})
	),
	instance_presence: T.model<TLInstancePresence>(
		'instance_presence',
		T.object({
			instanceId: idValidator<TLInstanceId>('instance'),
			typeName: T.literal('instance_presence'),
			id: idValidator<TLInstancePresenceId>('instance_presence'),
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
			camera: T.model<TLCamera>(
				'camera',
				T.object({
					typeName: T.literal('camera'),
					id: idValidator<TLCameraId>('camera'),
					x: T.number,
					y: T.number,
					z: T.number,
				})
			),
			screenBounds: T.boxModel,
			selectedIds: T.arrayOf(idValidator<TLShapeId>('shape')),
			currentPageId: idValidator<TLPageId>('page'),
			brush: T.boxModel.nullable(),
			scribble: T.object<TLScribble>({
				points: T.arrayOf(T.point),
				size: T.positiveNumber,
				color: uiColorTypeValidator,
				opacity: T.number,
				state: T.setEnum(TL_SCRIBBLE_STATES),
				delay: T.number,
			}).nullable(),
		})
	),
})
