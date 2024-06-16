import { useActions } from '../../context/actions'
import { ZoomTo100MenuItem, ZoomToFitMenuItem, ZoomToSelectionMenuItem } from '../menu-items'
import { TldrawUiMenuItem } from '../primitives/menus/TldrawUiMenuItem'

/** @public @react */
export function DefaultZoomMenuContent() {
	const actions = useActions()
	return (
		<>
			<TldrawUiMenuItem {...actions['zoom-in']} noClose />
			<TldrawUiMenuItem {...actions['zoom-out']} noClose />
			<ZoomTo100MenuItem />
			<ZoomToFitMenuItem />
			<ZoomToSelectionMenuItem />
		</>
	)
}
