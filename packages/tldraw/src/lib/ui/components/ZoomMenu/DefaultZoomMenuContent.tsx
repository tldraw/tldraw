import { ZoomTo100MenuItem, ZoomToFitMenuItem, ZoomToSelectionMenuItem } from '../menu-items'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

/** @public @react */
export function DefaultZoomMenuContent() {
	return (
		<>
			<TldrawUiMenuActionItem action="zoom-in" noClose />
			<TldrawUiMenuActionItem action="zoom-out" noClose />
			<ZoomTo100MenuItem />
			<ZoomToFitMenuItem />
			<ZoomToSelectionMenuItem />
		</>
	)
}
