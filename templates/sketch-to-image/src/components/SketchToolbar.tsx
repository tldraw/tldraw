import {
	ArrowToolbarItem,
	DefaultActionsMenu,
	DefaultQuickActions,
	DefaultToolbar,
	DrawToolbarItem,
	EllipseToolbarItem,
	EraserToolbarItem,
	HandToolbarItem,
	HighlightToolbarItem,
	LineToolbarItem,
	RectangleToolbarItem,
	SelectToolbarItem,
	TldrawUiMenuGroup,
} from 'tldraw'

/**
 * A trimmed toolbar focused on drawing. This template is about sketching, so we
 * surface the draw, shape, and line tools and drop text/notes/assets to keep
 * the input surface simple.
 */
export function SketchToolbar() {
	return (
		<DefaultToolbar>
			<TldrawUiMenuGroup id="selection">
				<SelectToolbarItem />
				<HandToolbarItem />
				<EraserToolbarItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="draw">
				<DrawToolbarItem />
				<HighlightToolbarItem />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="shapes">
				<RectangleToolbarItem />
				<EllipseToolbarItem />
				<LineToolbarItem />
				<ArrowToolbarItem />
			</TldrawUiMenuGroup>
			<DefaultQuickActions />
			<DefaultActionsMenu />
		</DefaultToolbar>
	)
}
