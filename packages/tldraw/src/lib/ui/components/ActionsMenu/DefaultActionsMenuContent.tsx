import { PORTRAIT_BREAKPOINT } from '../../constants'
import { useBreakpoint } from '../../context/breakpoints'
import { useAllowGroup, useAllowUngroup } from '../../hooks/menu-hooks'
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
	return (
		<>
			<TldrawUiMenuActionItem actionId="align-left" />
			<TldrawUiMenuActionItem actionId="align-center-horizontal" />
			<TldrawUiMenuActionItem actionId="align-right" />
			<TldrawUiMenuActionItem actionId="stretch-horizontal" />
			<TldrawUiMenuActionItem actionId="align-top" />
			<TldrawUiMenuActionItem actionId="align-center-vertical" />
			<TldrawUiMenuActionItem actionId="align-bottom" />
			<TldrawUiMenuActionItem actionId="stretch-vertical" />
		</>
	)
}

/** @public @react */
export function DistributeMenuItems() {
	return (
		<>
			<TldrawUiMenuActionItem actionId="distribute-horizontal" />
			<TldrawUiMenuActionItem actionId="distribute-vertical" />
		</>
	)
}

/** @public @react */
export function StackMenuItems() {
	return (
		<>
			<TldrawUiMenuActionItem actionId="stack-horizontal" />
			<TldrawUiMenuActionItem actionId="stack-vertical" />
		</>
	)
}

/** @public @react */
export function ReorderMenuItems() {
	return (
		<>
			<TldrawUiMenuActionItem actionId="send-to-back" />
			<TldrawUiMenuActionItem actionId="send-backward" />
			<TldrawUiMenuActionItem actionId="bring-forward" />
			<TldrawUiMenuActionItem actionId="bring-to-front" />
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
	return <TldrawUiMenuActionItem actionId="zoom-to-100" />
}
/** @public @react */

export function RotateCCWMenuItem() {
	return <TldrawUiMenuActionItem actionId="rotate-ccw" />
}
/** @public @react */

export function RotateCWMenuItem() {
	return <TldrawUiMenuActionItem actionId="rotate-cw" />
}
/** @public @react */

export function EditLinkMenuItem() {
	return <TldrawUiMenuActionItem actionId="edit-link" />
}
/** @public @react */

export function GroupOrUngroupMenuItem() {
	const allowGroup = useAllowGroup()
	const allowUngroup = useAllowUngroup()
	return allowGroup ? <GroupMenuItem /> : allowUngroup ? <UngroupMenuItem /> : <GroupMenuItem />
}
/** @public @react */

export function GroupMenuItem() {
	return <TldrawUiMenuActionItem actionId="group" />
}
/** @public @react */

export function UngroupMenuItem() {
	return <TldrawUiMenuActionItem actionId="ungroup" />
}
