import type { TLGroupShape, TLShape } from '@tldraw/tlschema'
import type { ReactNode } from 'react'
import { SVGContainer } from '../components/SVGContainer'
import type { Editor } from '../editor/Editor'
import type { ShapeUtil } from '../editor/shapes/ShapeUtil'
import { exportToSvg } from '../exports/exportToSvg'
import { svgExportCapability } from '../plugins/builtin/svgExport'
import { TLPlugin, definePlugin, defineSlot } from '../plugins/plugin'
import { DashedOutlineBox } from './DashedOutlineBox'

/**
 * A React component for one shape type. The React layer renders a shape with the first
 * contribution for its type, and with `ShapeUtil.component` when there is none. So a shape util
 * that has a `component` method keeps working, and a plugin can render a shape type without a
 * util method.
 *
 * @public
 */
export interface TLShapeComponent<S extends TLShape = TLShape> {
	readonly type: S['type']
	component(shape: S, editor: Editor): ReactNode
}

/** @public */
export const shapeComponentSlot = defineSlot<TLShapeComponent<any>>('react.shapeComponents')

/**
 * Render a shape with the React layer. Reactive.
 *
 * @internal
 */
export function renderShapeComponent<S extends TLShape>(util: ShapeUtil<S>, shape: S): ReactNode {
	const { editor } = util
	const contribution = editor.plugins.list(shapeComponentSlot).find((c) => c.type === shape.type)
	return contribution ? contribution.component(shape, editor) : util.component(shape)
}

function GroupShapeComponent(shape: TLGroupShape, editor: Editor) {
	const isErasing = editor.getErasingShapeIds().includes(shape.id)

	const { hintingShapeIds } = editor.getCurrentPageState()
	const isHintingOtherGroup =
		hintingShapeIds.length > 0 &&
		hintingShapeIds.some(
			(id) => id !== shape.id && editor.isShapeOfType(editor.getShape(id)!, 'group')
		)

	const isFocused = editor.getCurrentPageState().focusedGroupId !== shape.id

	if (
		!isErasing && // always show the outline while we're erasing the group
		// show the outline while the group is focused unless something outside of the group is being hinted
		// this happens dropping shapes from a group onto some outside group
		(isFocused || isHintingOtherGroup)
	) {
		return null
	}

	const bounds = editor.getShapeGeometry(shape).bounds

	return (
		<SVGContainer>
			<DashedOutlineBox className="tl-group" bounds={bounds} />
		</SVGContainer>
	)
}

/**
 * Renders the core group shape.
 *
 * @public
 */
export const groupShapeComponentPlugin = definePlugin({
	id: 'react.groupShapeComponent',
	setup(ctx) {
		ctx.contribute(shapeComponentSlot, {
			type: 'group',
			component: GroupShapeComponent,
		} satisfies TLShapeComponent<TLGroupShape>)
	},
})

/**
 * Exports shapes to SVG by rendering them with React into a hidden DOM element.
 *
 * @public
 */
export const reactSvgExportPlugin = definePlugin({
	id: 'react.svgExport',
	provides: [svgExportCapability],
	setup(ctx) {
		ctx.provide(svgExportCapability, {
			exportToSvg: (shapeIds, opts) => exportToSvg(ctx.editor, shapeIds, opts),
		})
	},
})

/**
 * The plugins that make up the React output layer: shape components and SVG export.
 *
 * @public
 */
export const reactRenderingPlugins: readonly TLPlugin[] = [
	groupShapeComponentPlugin,
	reactSvgExportPlugin,
]
