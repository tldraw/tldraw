import { useEditor } from '@tldraw/editor'
import { ZoomTo100MenuItem, ZoomToFitMenuItem, ZoomToSelectionMenuItem } from '../menu-items'
import { TldrawUiMenuActionItem } from '../primitives/menus/TldrawUiMenuActionItem'

/** @public @react */
export function DefaultZoomMenuContent() {
	const editor = useEditor()
	const {isZoomLocked} = editor.getCameraOptions()

	return (
		<>
			<TldrawUiMenuActionItem actionId="zoom-in" disabled={isZoomLocked} noClose />
			<TldrawUiMenuActionItem actionId="zoom-out" disabled={isZoomLocked} noClose />
			<ZoomTo100MenuItem />
			<ZoomToFitMenuItem />
			<ZoomToSelectionMenuItem />
			<TldrawUiMenuActionItem actionId="toggle-zoom" noClose />
		</>
	)
}
