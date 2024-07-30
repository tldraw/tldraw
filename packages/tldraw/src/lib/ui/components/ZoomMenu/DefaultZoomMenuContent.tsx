import { ZoomTo100MenuItem, ZoomToFitMenuItem, ZoomToSelectionMenuItem } from '../menu-items'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public @react */
export function DefaultZoomMenuContent() {
	return (
		<>
			<TldrawUiMenuItem action="zoom-in" noClose />
			<TldrawUiMenuItem action="zoom-out" noClose />
			<ZoomTo100MenuItem />
			<ZoomToFitMenuItem />
			<ZoomToSelectionMenuItem />
		</>
	)
}
