import { useEditor, useValue } from '@tldraw/editor'
import { useActions } from '../../../hooks/useActions'
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

function ZoomTo100MenuItem() {
	const editor = useEditor()
	const isZoomedTo100 = useValue('zoomed to 100', () => editor.getZoomLevel() === 1, [editor])
	const actions = useActions()

	return <TldrawUiMenuItem {...actions['zoom-to-100']} noClose disabled={isZoomedTo100} />
}

function ZoomToFitMenuItem() {
	const editor = useEditor()
	const hasShapes = useValue('has shapes', () => editor.getCurrentPageShapeIds().size > 0, [editor])
	const actions = useActions()

	return (
		<TldrawUiMenuItem
			{...actions['zoom-to-fit']}
			disabled={!hasShapes}
			data-testid="minimap.zoom-menu.zoom-to-fit"
			noClose
		/>
	)
}

function ZoomToSelectionMenuItem() {
	const editor = useEditor()
	const hasSelected = useValue('has shapes', () => editor.getSelectedShapeIds().length > 0, [
		editor,
	])
	const actions = useActions()

	return (
		<TldrawUiMenuItem
			{...actions['zoom-to-selection']}
			disabled={!hasSelected}
			data-testid="minimap.zoom-menu.zoom-to-selection"
			noClose
		/>
	)
}
