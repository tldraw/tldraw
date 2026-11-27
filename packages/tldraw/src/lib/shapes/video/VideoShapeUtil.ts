import {
	BaseBoxShapeUtil,
	createShapeId,
	defineMessages,
	SvgExportContext,
	TLAsset,
	TLShapePartial,
	TLVideoAsset,
	TLVideoShape,
	translateMessage,
	VecModel,
	videoShapeMigrations,
	videoShapeProps,
} from '@tldraw/editor'
import type { ShapeOptionsWithDisplayValues } from '../shared/getDisplayValues'

/** @public */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface VideoShapeUtilDisplayValues {}

/** @public */
export interface VideoShapeOptions extends ShapeOptionsWithDisplayValues<
	TLVideoShape,
	VideoShapeUtilDisplayValues
> {
	/**
	 * Should videos play automatically?
	 */
	autoplay: boolean
}

const messages = defineMessages({
	name: { id: 'a11y.shape-video', defaultMessage: 'Video' },
})

/** @public */
export class VideoShapeUtil extends BaseBoxShapeUtil<TLVideoShape> {
	static override type = 'video' as const
	static override props = videoShapeProps
	static override migrations = videoShapeMigrations
	static override handledAssetTypes = ['video'] as const

	override options: VideoShapeOptions = {
		autoplay: true,
		getDefaultDisplayValues(): VideoShapeUtilDisplayValues {
			return {}
		},
		getCustomDisplayValues(): Partial<VideoShapeUtilDisplayValues> {
			return {}
		},
	}

	override getShapeName() {
		return translateMessage(this.editor.i18n(), messages.name)
	}

	override canEdit(shape: TLVideoShape) {
		return true
	}
	override isAspectRatioLocked(shape: TLVideoShape) {
		return true
	}

	override getDefaultProps(): TLVideoShape['props'] {
		return {
			w: 100,
			h: 100,
			assetId: null,
			autoplay: this.options.autoplay,
			url: '',
			altText: '',
			// Not used, but once upon a time were used to sync video state between users
			time: 0,
			playing: true,
		}
	}

	override createShapeForAsset(asset: TLAsset, position: VecModel): TLShapePartial | null {
		const videoAsset = asset as TLVideoAsset
		return {
			id: createShapeId(),
			type: 'video',
			x: position.x,
			y: position.y,
			opacity: 1,
			props: {
				assetId: videoAsset.id,
				w: videoAsset.props.w,
				h: videoAsset.props.h,
			},
		}
	}

	override getAriaDescriptor(shape: TLVideoShape) {
		return shape.props.altText
	}

	// The React view draws the shape, see `videoShapeView`. These methods call it so that a
	// subclass can override them or call `super`.
	component(shape: TLVideoShape) {
		return this.getView()?.component(shape, this) ?? null
	}

	override getIndicatorPath(shape: TLVideoShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override async toSvg(shape: TLVideoShape, ctx: SvgExportContext) {
		return (await this.getView()?.toSvg?.(shape, ctx, this)) ?? null
	}
}
