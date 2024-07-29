import { useEditor, useValue } from '@tldraw/editor'
import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useActions } from '../../context/actions'
import { useBreakpoint } from '../../context/breakpoints'
import {
	useAllowGroup,
	useAllowUngroup,
	useHasLinkShapeSelected,
	useIsInSelectState,
	useThreeStackableItems,
	useUnlockedSelectedShapesCount,
} from '../../hooks/menu-hooks'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

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
			<TldrawUiMenuItem action="align-left" disabled={!enabled} />
			<TldrawUiMenuItem action="align-center-horizontal" disabled={!enabled} />
			<TldrawUiMenuItem action="align-right" disabled={!enabled} />
			<TldrawUiMenuItem action="stretch-horizontal" disabled={!enabled} />
			<TldrawUiMenuItem action="align-top" disabled={!enabled} />
			<TldrawUiMenuItem action="align-center-vertical" disabled={!enabled} />
			<TldrawUiMenuItem action="align-bottom" disabled={!enabled} />
			<TldrawUiMenuItem action="stretch-vertical" disabled={!enabled} />
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
			<TldrawUiMenuItem action="distribute-horizontal" disabled={!enabled} />
			<TldrawUiMenuItem action="distribute-vertical" disabled={!enabled} />
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
			<TldrawUiMenuItem action="stack-horizontal" disabled={!enabled} />
			<TldrawUiMenuItem action="stack-vertical" disabled={!enabled} />
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
			<TldrawUiMenuItem action="send-to-back" disabled={!enabled} />
			<TldrawUiMenuItem action="send-backward" disabled={!enabled} />
			<TldrawUiMenuItem action="bring-forward" disabled={!enabled} />
			<TldrawUiMenuItem action="bring-to-front" disabled={!enabled} />
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

	return <TldrawUiMenuItem action="zoom-to-100" disabled={isZoomedTo100} />
}
/** @public @react */

export function RotateCCWMenuItem() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return <TldrawUiMenuItem action="rotate-ccw" disabled={!enabled} />
}
/** @public @react */

export function RotateCWMenuItem() {
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return <TldrawUiMenuItem action="rotate-cw" disabled={!enabled} />
}
/** @public @react */

export function EditLinkMenuItem() {
	const showEditLink = useHasLinkShapeSelected()
	const isInSelectState = useIsInSelectState()
	const enabled = showEditLink && isInSelectState

	return <TldrawUiMenuItem action="edit-link" disabled={!enabled} />
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

	return <TldrawUiMenuItem action="group" disabled={!enabled} />
}
/** @public @react */

export function UngroupMenuItem() {
	return <TldrawUiMenuItem action="ungroup" />
}
