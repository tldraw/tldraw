import type { TLGroupShape } from '@tldraw/tlschema'
import { SVGContainer } from '../components/SVGContainer'
import type { GroupShapeUtil } from '../editor/shapes/group/GroupShapeUtil'
import { shapeViewSlot, type TLShapeView } from '../editor/shapes/shapeViews'
import { definePlugin } from '../plugins/plugin'
import { DashedOutlineBox } from './DashedOutlineBox'

function GroupShapeComponent(shape: TLGroupShape, { editor }: GroupShapeUtil) {
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
 * The view for the core group shape.
 *
 * @public
 */
export const groupShapeViewPlugin = definePlugin({
	id: 'react.groupShapeView',
	setup(ctx) {
		ctx.contribute(shapeViewSlot, {
			type: 'group',
			component: GroupShapeComponent,
		} satisfies TLShapeView<TLGroupShape, GroupShapeUtil>)
	},
})
