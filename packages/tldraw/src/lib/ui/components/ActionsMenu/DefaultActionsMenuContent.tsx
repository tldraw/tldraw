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

/** @public */
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

/** @public */
export function AlignMenuItems() {
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)
	const isInSelectState = useIsInSelectState()
	const disabled = !twoSelected || !isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['align-left']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['align-center-horizontal']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['align-right']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['stretch-horizontal']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['align-top']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['align-center-vertical']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['align-bottom']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['stretch-vertical']} disabled={disabled} />
		</>
	)
}

/** @public */
export function DistributeMenuItems() {
	const actions = useActions()
	const threeSelected = useUnlockedSelectedShapesCount(3)
	const isInSelectState = useIsInSelectState()
	const disabled = !threeSelected || !isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['distribute-horizontal']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['distribute-vertical']} disabled={disabled} />
		</>
	)
}

/** @public */
export function StackMenuItems() {
	const actions = useActions()
	const threeStackableItems = useThreeStackableItems()
	const isInSelectState = useIsInSelectState()
	const disabled = !threeStackableItems || !isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['stack-horizontal']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['stack-vertical']} disabled={disabled} />
		</>
	)
}

/** @public */
export function ReorderMenuItems() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const disabled = !oneSelected || !isInSelectState

	return (
		<>
			<TldrawUiMenuItem {...actions['send-to-back']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['send-backward']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['bring-forward']} disabled={disabled} />
			<TldrawUiMenuItem {...actions['bring-to-front']} disabled={disabled} />
		</>
	)
}

/** @public */

export function ZoomOrRotateMenuItem() {
	const breakpoint = useBreakpoint()
	return breakpoint < PORTRAIT_BREAKPOINT.TABLET_SM ? <ZoomTo100MenuItem /> : <RotateCCWMenuItem />
}
/** @public */

export function ZoomTo100MenuItem() {
	const actions = useActions()
	const editor = useEditor()
	const isZoomedTo100 = useValue('zoom is 1', () => editor.getZoomLevel() === 1, [editor])

	return <TldrawUiMenuItem {...actions['zoom-to-100']} disabled={isZoomedTo100} />
}
/** @public */

export function RotateCCWMenuItem() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const disabled = !oneSelected || !isInSelectState

	return <TldrawUiMenuItem {...actions['rotate-ccw']} disabled={disabled} />
}
/** @public */

export function RotateCWMenuItem() {
	const actions = useActions()
	const oneSelected = useUnlockedSelectedShapesCount(1)
	const isInSelectState = useIsInSelectState()
	const disabled = !oneSelected || !isInSelectState

	return <TldrawUiMenuItem {...actions['rotate-cw']} disabled={disabled} />
}
/** @public */

export function EditLinkMenuItem() {
	const actions = useActions()
	const showEditLink = useHasLinkShapeSelected()
	const isInSelectState = useIsInSelectState()
	const disabled = !showEditLink || !isInSelectState

	return <TldrawUiMenuItem {...actions['edit-link']} disabled={disabled} />
}
/** @public */

export function GroupOrUngroupMenuItem() {
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	return allowGroup ? <GroupMenuItem /> : allowUngroup ? <UngroupMenuItem /> : <GroupMenuItem />
}
/** @public */

export function GroupMenuItem() {
	const actions = useActions()
	const twoSelected = useUnlockedSelectedShapesCount(2)

	return <TldrawUiMenuItem {...actions['group']} disabled={!twoSelected} />
}
/** @public */

export function UngroupMenuItem() {
	const actions = useActions()
	return <TldrawUiMenuItem {...actions['ungroup']} />
}
