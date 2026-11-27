import {
	BaseBoxShapeUtil,
	TLEmbedShape,
	TLEmbedShapeProps,
	TLResizeInfo,
	embedShapeMigrations,
	embedShapeProps,
	lerp,
	resizeBox,
} from '@tldraw/editor'
import {
	DEFAULT_EMBED_DEFINITIONS,
	DefaultEmbedConfig,
	TLEmbedDefinition,
} from '../../defaultEmbedDefinitions'
import { TLEmbedResult, getCorrectedEmbedSize, getEmbedInfo } from '../../utils/embeds/embeds'
import type { ShapeOptionsWithDisplayValues } from '../shared/getDisplayValues'

/** @public */
export interface EmbedShapeUtilDisplayValues {
	showShadow: boolean
}

/** @public */
export interface EmbedShapeOptions extends ShapeOptionsWithDisplayValues<
	TLEmbedShape,
	EmbedShapeUtilDisplayValues
> {
	/** The embed definitions to use for this shape util. */
	readonly embedDefinitions: readonly TLEmbedDefinition[]
	/**
	 * Per-embed configuration, keyed by embed type. Passed to each definition's `toEmbedUrl` when
	 * building its embed URL — for example, an API key for the default Google Maps embed:
	 *
	 * ```ts
	 * EmbedShapeUtil.configure({ embedConfig: { google_maps: { apiKey: '...' } } })
	 * ```
	 */
	readonly embedConfig?: DefaultEmbedConfig & Record<string, unknown>
}

/** @public */
export class EmbedShapeUtil extends BaseBoxShapeUtil<TLEmbedShape> {
	static override type = 'embed' as const
	static override props = embedShapeProps
	static override migrations = embedShapeMigrations

	override options: EmbedShapeOptions = {
		embedDefinitions: DEFAULT_EMBED_DEFINITIONS,
		embedConfig: {},
		getDefaultDisplayValues(): EmbedShapeUtilDisplayValues {
			return {
				showShadow: true,
			}
		},
		getCustomDisplayValues(): Partial<EmbedShapeUtilDisplayValues> {
			return {}
		},
	}

	override canEditWhileLocked(shape: TLEmbedShape) {
		const result = this.getEmbedDefinition(shape.props.url)
		if (!result) return true
		return result.definition.canEditWhileLocked ?? true
	}

	private static legacyEmbedDefinitions: readonly TLEmbedDefinition[] | null = null

	/** @deprecated - Use `EmbedShapeUtil.configure({ embedDefinitions: [...] })` instead. */
	static setEmbedDefinitions(embedDefinitions: readonly TLEmbedDefinition[]) {
		EmbedShapeUtil.legacyEmbedDefinitions = embedDefinitions
	}

	private getEmbedDefs(): readonly TLEmbedDefinition[] {
		return EmbedShapeUtil.legacyEmbedDefinitions ?? this.options.embedDefinitions
	}

	getEmbedDefinitions(): readonly TLEmbedDefinition[] {
		return this.getEmbedDefs()
	}

	getEmbedDefinition(url: string): TLEmbedResult {
		return getEmbedInfo(this.getEmbedDefs(), url, this.options.embedConfig)
	}

	/**
	 * Resolve the embed's true aspect ratio (for definitions with `sizeToContentAspectRatio`) and
	 * correct the shape's size to match. The dimensions come from the URL's OpenGraph metadata via
	 * the editor's url asset handler (the same "unfurl" path bookmarks use). The correction is
	 * applied without adding to the undo history.
	 */
	async resolveAspectRatio(shape: TLEmbedShape) {
		const { url } = shape.props
		const definition = this.getEmbedDefinition(url)?.definition
		if (!definition?.sizeToContentAspectRatio || !url) return

		const resolvedRatio = await this.getContentAspectRatio(url)

		// The editor may have been torn down while the metadata was in flight.
		if (this.editor.isDisposed) return

		const latest = this.editor.getShape<TLEmbedShape>(shape.id)
		// Bail if the shape is gone or its url changed while we were awaiting: a later run for the
		// new url will handle it, and we must not apply this url's ratio to a different video.
		if (!latest || latest.props.url !== url) return

		const corrected = getCorrectedEmbedSize({
			w: latest.props.w,
			h: latest.props.h,
			resolvedRatio,
		})
		if (!corrected) return

		// `onResize` enforces a per-axis minimum (inflated by the aspect ratio when locked), so a very
		// tall/narrow target could have one axis clamped while the other isn't — that would break the
		// ratio and re-letterboxes the very content we're correcting. Scale the whole target up so it
		// clears both floors, which preserves the ratio at the cost of a slightly larger box only in
		// the extreme (still far smaller than leaving one axis un-corrected).
		const { minWidth, minHeight } = this.getResizeMinBounds(latest)
		const clearFloor = Math.max(1, minWidth / corrected.w, minHeight / corrected.h)
		const targetW = corrected.w * clearFloor
		const targetH = corrected.h * clearFloor

		// Let the editor resize the shape: by default it scales around the shape's page-space center
		// and along its own rotation axis, so the center stays fixed even if the embed was rotated
		// before the ratio resolved. No need to compute x/y by hand.
		//
		// We pass `isAspectRatioLocked: false` because embeds like Vimeo lock their aspect ratio,
		// which would otherwise make the editor merge our non-uniform scale into a single uniform
		// factor — leaving the wrong ratio and defeating the whole correction.
		this.editor.run(
			() => {
				this.editor.resizeShape(
					latest.id,
					{
						x: targetW / latest.props.w,
						y: targetH / latest.props.h,
					},
					{ isAspectRatioLocked: false }
				)
			},
			{ history: 'ignore' }
		)
	}

	/**
	 * Resolve the content's aspect ratio from the URL's OpenGraph metadata, fetched through the
	 * editor's url asset handler (the "unfurl" service). Returns `undefined` if no usable dimensions
	 * are available (e.g. no unfurl service is configured, or the page reports no image size).
	 */
	private async getContentAspectRatio(url: string): Promise<number | undefined> {
		try {
			const asset = await this.editor.getAssetForExternalContent({ type: 'url', url })
			if (!asset || asset.type !== 'bookmark') return undefined
			const width = asset.meta.imageWidth
			const height = asset.meta.imageHeight
			if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > 0) {
				return width / height
			}
		} catch {
			// Resolving the aspect ratio is best-effort: never let a metadata fetch failure surface.
		}
		return undefined
	}

	override getText(shape: TLEmbedShape) {
		return shape.props.url
	}

	override getAriaDescriptor(shape: TLEmbedShape) {
		const embedInfo = this.getEmbedDefinition(shape.props.url)
		return embedInfo?.definition.title
	}

	override hideSelectionBoundsFg(shape: TLEmbedShape) {
		return !this.canResize(shape)
	}
	override canEdit(shape: TLEmbedShape) {
		return true
	}
	override canResize(shape: TLEmbedShape) {
		return this.getEmbedDefinition(shape.props.url)?.definition?.doesResize ?? true
	}
	override canEditInReadonly(shape: TLEmbedShape) {
		return true
	}

	override getDefaultProps(): TLEmbedShape['props'] {
		return {
			w: 300,
			h: 300,
			url: '',
		}
	}

	override getGeometry(shape: TLEmbedShape) {
		return super.getGeometry(shape)
	}

	override isAspectRatioLocked(shape: TLEmbedShape) {
		const embedInfo = this.getEmbedDefinition(shape.props.url)
		return embedInfo?.definition.isAspectRatioLocked ?? false
	}

	/**
	 * The minimum width/height a resize of `shape` is allowed to reach. When the embed's aspect ratio
	 * is locked, the longer axis's minimum is inflated by the current aspect ratio so that shrinking
	 * to the floor keeps the shorter axis at or above the base minimum.
	 */
	private getResizeMinBounds(shape: TLEmbedShape) {
		const embedInfo = this.getEmbedDefinition(shape.props.url)
		let minWidth = embedInfo?.definition.minWidth ?? 200
		let minHeight = embedInfo?.definition.minHeight ?? 200
		if (this.isAspectRatioLocked(shape)) {
			// Neither the width nor the height can be less than the base minimum.
			const aspectRatio = shape.props.w / shape.props.h
			if (aspectRatio > 1) {
				// Landscape
				minWidth *= aspectRatio
			} else {
				// Portrait
				minHeight /= aspectRatio
			}
		}
		return { minWidth, minHeight }
	}

	override onResize(shape: TLEmbedShape, info: TLResizeInfo<TLEmbedShape>) {
		return resizeBox(shape, info, this.getResizeMinBounds(shape))
	}

	// The React view draws the shape, see `embedShapeView`. This method calls it so that a
	// subclass can override it or call `super`.
	override component(shape: TLEmbedShape) {
		return this.getView()?.component(shape, this) ?? null
	}

	override getIndicatorPath(shape: TLEmbedShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, shape.props.h)
		return path
	}

	override getInterpolatedProps(
		startShape: TLEmbedShape,
		endShape: TLEmbedShape,
		t: number
	): TLEmbedShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
		}
	}
}
