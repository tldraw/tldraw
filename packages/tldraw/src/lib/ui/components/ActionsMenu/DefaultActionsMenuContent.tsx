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
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const isInSelectState = useIsInSelectState()
	const enabled = twoSelected && isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['align-left']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['align-center-horizontal']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['align-right']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['stretch-horizontal']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['align-top']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['align-center-vertical']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['align-bottom']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['stretch-vertical']} disabled={!enabled} />
		</>
	)
}

/** @public @react */
export function DistributeMenuItems() {
	const actions = useActions()
	const threeSelected = useUnlockedSelectedShapesCount(3)
	const isInSelectState = useIsInSelectState()
	const enabled = threeSelected && isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['distribute-horizontal']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['distribute-vertical']} disabled={!enabled} />
		</>
	)
}

/** @public @react */
export function StackMenuItems() {
	const actions = useActions()
	const threeStackableItems = useThreeStackableItems()
	const isInSelectState = useIsInSelectState()
	const enabled = threeStackableItems && isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['stack-horizontal']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['stack-vertical']} disabled={!enabled} />
		</>
	)
}

/** @public @react */
export function ReorderMenuItems() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['send-to-back']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['send-backward']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['bring-forward']} disabled={!enabled} />
			<TldrawUiMenuItem {...actions['bring-to-front']} disabled={!enabled} />
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
	const actions = useActions()
	const editor = useEditor()
	const isZoomedTo100 = useValue('zoom is 1', () => editor.getZoomLevel() === 1, [editor])

	return <TldrawUiMenuItem {...actions['zoom-to-100']} disabled={isZoomedTo100} />
}
/** @public @react */

export function RotateCCWMenuItem() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return <TldrawUiMenuItem {...actions['rotate-ccw']} disabled={!enabled} />
}
/** @public @react */

export function RotateCWMenuItem() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const enabled = oneSelected && isInSelectState

	return <TldrawUiMenuItem {...actions['rotate-cw']} disabled={!enabled} />
}
/** @public @react */

export function EditLinkMenuItem() {
	const actions = useActions()
	const showEditLink = useHasLinkShapeSelected()
	const isInSelectState = useIsInSelectState()
	const enabled = showEditLink && isInSelectState

	return <TldrawUiMenuItem {...actions['edit-link']} disabled={!enabled} />
}
/** @public @react */

export function GroupOrUngroupMenuItem() {
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	return allowGroup ? <GroupMenuItem /> : allowUngroup ? <UngroupMenuItem /> : <GroupMenuItem />
}
/** @public @react */

export function GroupMenuItem() {
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const isInSelectState = useIsInSelectState()
	const enabled = twoSelected && isInSelectState

	return <TldrawUiMenuItem {...actions['group']} disabled={!enabled} />
}
/** @public @react */

export function UngroupMenuItem() {
	const actions = useActions()
	return <TldrawUiMenuItem {...actions['ungroup']} />
}
