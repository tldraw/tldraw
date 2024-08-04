import { useEditor, useValue } from '@tldraw/editor'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import {
	useAllowGroup,
	useAllowUngroup,
	useHasLinkShapeSelected,
	useIsInSelectState,
	useThreeStackableItems,
	useUnlockedSelectedShapesCount,
} from '../../hooks/menu-hooks'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

/** @public @react */
export function DefaultActionsMenuContent() {
	return (
		<>
			<AlignMenuItems />
			<DistributeMenuItems />
			<StackMenuItems />
			<ReorderMenuItems />
			<ZoomOrRotateMenuItem />
			<RotateCWMenuItem />
			<EditLinkMenuItem />
			<GroupOrUngroupMenuItem />
		</>
	)
}

/** @public @react */
export function AlignMenuItems() {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const isInSelectState = useIsInSelectState()
	const enabled = twoSelected && isInSelectState

	return (
		<>
			<TldrawUiMenuActionItem action="align-left" disabled={!enabled} />
			<TldrawUiMenuActionItem action="align-center-horizontal" disabled={!enabled} />
			<TldrawUiMenuActionItem action="align-right" disabled={!enabled} />
			<TldrawUiMenuActionItem action="stretch-horizontal" disabled={!enabled} />
			<TldrawUiMenuActionItem action="align-top" disabled={!enabled} />
			<TldrawUiMenuActionItem action="align-center-vertical" disabled={!enabled} />
			<TldrawUiMenuActionItem action="align-bottom" disabled={!enabled} />
			<TldrawUiMenuActionItem action="stretch-vertical" disabled={!enabled} />
		</>
	)
}

/** @public @react */
export function DistributeMenuItems() {
	const threeSelected = useUnlockedSelectedShapesCount(3)
	const isInSelectState = useIsInSelectState()
	const enabled = threeSelected && isInSelectState

	return (
		<>
			<TldrawUiMenuActionItem action="distribute-horizontal" disabled={!enabled} />
			<TldrawUiMenuActionItem action="distribute-vertical" disabled={!enabled} />
		</>
	)
}

/** @public @react */
export function StackMenuItems() {
	const threeStackableItems = useThreeStackableItems()
	const isInSelectState = useIsInSelectState()
	const enabled = threeStackableItems && isInSelectState

	return (
		<>
			<TldrawUiMenuActionItem action="stack-horizontal" disabled={!enabled} />
			<TldrawUiMenuActionItem action="stack-vertical" disabled={!enabled} />
		</>
	)
}

/** @public @react */
export function ReorderMenuItems() {
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return (
		<>
			<TldrawUiMenuActionItem action="send-to-back" disabled={!enabled} />
			<TldrawUiMenuActionItem action="send-backward" disabled={!enabled} />
			<TldrawUiMenuActionItem action="bring-forward" disabled={!enabled} />
			<TldrawUiMenuActionItem action="bring-to-front" disabled={!enabled} />
		</>
	)
}

/** @public @react */

export function ZoomOrRotateMenuItem() {
	const breakpoint = useBreakpoint()
	return breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM ? <ZoomTo100MenuItem /> : <RotateCCWMenuItem />
}
/** @public @react */

export function ZoomTo100MenuItem() {
	const editor = useEditor()
	const isZoomedTo100 = useValue('zoom is 1', () => editor.getZoomLevel() === 1, [editor])

	return <TldrawUiMenuActionItem action="zoom-to-100" disabled={isZoomedTo100} />
}
/** @public @react */

export function RotateCCWMenuItem() {
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return <TldrawUiMenuActionItem action="rotate-ccw" disabled={!enabled} />
}
/** @public @react */

export function RotateCWMenuItem() {
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return <TldrawUiMenuActionItem action="rotate-cw" disabled={!enabled} />
}
/** @public @react */

export function EditLinkMenuItem() {
	const showEditLink = useHasLinkShapeSelected()
	const isInSelectState = useIsInSelectState()
	const enabled = showEditLink && isInSelectState

	return <TldrawUiMenuActionItem action="edit-link" disabled={!enabled} />
}
/** @public @react */

export function GroupOrUngroupMenuItem() {
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	return allowGroup ? <GroupMenuItem /> : allowUngroup ? <UngroupMenuItem /> : <GroupMenuItem />
}
/** @public @react */

export function GroupMenuItem() {
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const isInSelectState = useIsInSelectState()
	const enabled = twoSelected && isInSelectState

	return <TldrawUiMenuActionItem action="group" disabled={!enabled} />
}
/** @public @react */

export function UngroupMenuItem() {
	return <TldrawUiMenuActionItem action="ungroup" />
}
