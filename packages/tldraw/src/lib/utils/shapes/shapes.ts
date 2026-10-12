import { Editor, ExtractShapeByProps, Geometry2d, Group2d, TLShape } from '@tldraw/editor'

/**
 * A shape whose `url` prop holds a link: a geo, note, image, video, or bookmark shape, or a custom
 * shape that follows the same convention.
 *
 * @internal
 */
export type TLShapeWithLink = ExtractShapeByProps<{ url: string }>

/**
 * Embed shapes are excluded: their `url` is the embedded content's source rather than a link
 * decorating the shape.
 *
 * @internal
 */
export function isShapeWithLink(shape: TLShape | null | undefined): shape is TLShapeWithLink {
	return !!(
		shape &&
		shape.type !== 'embed' &&
		'url' in shape.props &&
		typeof shape.props.url === 'string'
	)
}

/**
 * The shape a link would be set on. Both the "Edit link…" action and pasting a url read this, so
 * that the shapes you can put a link on are the same either way.
 *
 * @internal
 */
export function getSelectedLinkShape(editor: Editor): TLShapeWithLink | undefined {
	const shape = editor.getOnlySelectedShape()
	if (!isShapeWithLink(shape) || editor.isShapeOrAncestorLocked(shape)) return undefined
	return shape
}

/**
 * Return all the text labels in a geometry.
 *
 * @param geometry - The geometry to get the text labels from.
 *
 * @public
 */
export function getTextLabels(geometry: Geometry2d) {
	if (geometry.isLabel) {
		return [geometry]
	}

	if (geometry instanceof Group2d) {
		return geometry.children.filter((child) => child.isLabel)
	}

	return []
}
