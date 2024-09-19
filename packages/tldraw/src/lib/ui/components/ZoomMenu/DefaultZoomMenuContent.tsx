import { ZoomTo100MenuItem, ZoomToFitMenuItem, ZoomToSelectionMenuItem } from '../menu-items'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

/** @public @react */
export function DefaultZoomMenuContent() {
	return (
		<>
			<TldrawUiMenuActionItem actionId="zoom-in" noClose />
			<TldrawUiMenuActionItem actionId="zoom-out" noClose />
			<ZoomTo100MenuItem />
			<ZoomToFitMenuItem />
			<ZoomToSelectionMenuItem />
		</>
	)
}
