import { useActions } from '../../../hooks/useActions'
import {
	ZoomTo100MenuItem,
	ZoomToFitMenuItem,
	ZoomToSelectionMenuItem,
} from '../MenuItems/MenuItems'
import { TldrawUiMenuItem } from '../MenuItems/TldrawUiMenuItem'

/** @public */
export function DefaultZoomMenu() {
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
