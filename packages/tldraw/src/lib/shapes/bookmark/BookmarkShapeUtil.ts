// oxlint-disable typescript/no-empty-object-type
import {
	BaseBoxShapeUtil,
	bookmarkShapeMigrations,
	bookmarkShapeProps,
	defineMessages,
	lerp,
	Rectangle2d,
	T,
	TLBookmarkAsset,
	TLBookmarkShape,
	TLBookmarkShapeProps,
	translateMessage,
} from '@tldraw/editor'
import { convertCommonTitleHTMLEntities } from '../../utils/text/text'
import type { ShapeOptionsWithDisplayValues } from '../shared/getDisplayValues'
import {
	BOOKMARK_HEIGHT,
	BOOKMARK_WIDTH,
	getBookmarkShapeHeight,
	setBookmarkHeight,
	resolveBookmarkAssetForUrlChange,
} from './bookmarks'

/** @public */
export type BookmarkShapeUtilDisplayValues = object

/** @public */
export interface BookmarkShapeOptions extends ShapeOptionsWithDisplayValues<
	TLBookmarkShape,
	BookmarkShapeUtilDisplayValues
> {}

const messages = defineMessages({
	name: { id: 'tool.bookmark', defaultMessage: 'Bookmark' },
})

/** @public */
export class BookmarkShapeUtil extends BaseBoxShapeUtil<TLBookmarkShape> {
	static override type = 'bookmark' as const
	static override props = bookmarkShapeProps
	static override migrations = bookmarkShapeMigrations

	override options: BookmarkShapeOptions = {
		getDefaultDisplayValues(): BookmarkShapeUtilDisplayValues {
			return {}
		},
		getCustomDisplayValues(): Partial<BookmarkShapeUtilDisplayValues> {
			return {}
		},
	}

	override getShapeName() {
		return translateMessage(this.editor.i18n(), messages.name)
	}

	override canResize(shape: TLBookmarkShape) {
		return false
	}

	override hideSelectionBoundsFg(shape: TLBookmarkShape) {
		return true
	}

	override getText(shape: TLBookmarkShape) {
		return shape.props.url
	}

	override getAriaDescriptor(shape: TLBookmarkShape) {
		const asset = (
			shape.props.assetId ? this.editor.getAsset(shape.props.assetId) : null
		) as TLBookmarkAsset | null

		if (!asset?.props.title) return undefined

		return (
			convertCommonTitleHTMLEntities(asset.props.title) +
			(asset.props.description ? ', ' + asset.props.description : '')
		)
	}

	override getDefaultProps(): TLBookmarkShape['props'] {
		return {
			url: '',
			w: BOOKMARK_WIDTH,
			h: BOOKMARK_HEIGHT,
			assetId: null,
		}
	}

	override getGeometry(shape: TLBookmarkShape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: getBookmarkShapeHeight(this.editor, shape),
			isFilled: true,
		})
	}

	// The React view draws the shape, see `bookmarkShapeView`. This method calls it so that a
	// subclass can override it or call `super`.
	override component(shape: TLBookmarkShape) {
		return this.getView()?.component(shape, this) ?? null
	}

	override getIndicatorPath(shape: TLBookmarkShape): Path2D {
		const path = new Path2D()
		path.rect(0, 0, shape.props.w, getBookmarkShapeHeight(this.editor, shape))
		return path
	}

	override onBeforeCreate(next: TLBookmarkShape) {
		return setBookmarkHeight(this.editor, next)
	}

	override onBeforeUpdate(prev: TLBookmarkShape, shape: TLBookmarkShape) {
		let next = shape
		if (prev.props.url !== shape.props.url) {
			if (!T.linkUrl.isValid(shape.props.url)) {
				return { ...shape, props: { ...shape.props, url: prev.props.url } }
			}
			next = resolveBookmarkAssetForUrlChange(this.editor, shape)
		}

		if (prev.props.assetId !== next.props.assetId || prev.props.url !== next.props.url) {
			return setBookmarkHeight(this.editor, next)
		}

		return next === shape ? undefined : next
	}
	override getInterpolatedProps(
		startShape: TLBookmarkShape,
		endShape: TLBookmarkShape,
		t: number
	): TLBookmarkShapeProps {
		return {
			...(t > 0.5 ? endShape.props : startShape.props),
			w: lerp(startShape.props.w, endShape.props.w, t),
			h: lerp(startShape.props.h, endShape.props.h, t),
		}
	}
}
