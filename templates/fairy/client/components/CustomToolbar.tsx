import {
	DefaultToolbar,
	DefaultToolbarContent,
	TldrawUiMenuItem,
	useIsToolSelected,
	useTools,
} from 'tldraw'

export function CustomToolbar() {
	const tools = useTools()
	const isFairySelected = useIsToolSelected(tools['fairy'])

	return (
		<DefaultToolbar>
			<TldrawUiMenuItem {...tools['fairy']} isSelected={isFairySelected} />
			<DefaultToolbarContent />
		</DefaultToolbar>
	)
}
