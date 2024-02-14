import { TLPageId, track, useEditor } from '@tldraw/editor'
import { useActions } from '../context/actions'
import { useUiEvents } from '../context/events'
import { useToasts } from '../context/toasts'
import { TldrawUiMenuGroup } from './menus/TldrawUiMenuGroup'
import { TldrawUiMenuItem } from './menus/TldrawUiMenuItem'
import { TldrawUiMenuSubmenu } from './menus/TldrawUiMenuSubmenu'

export const MoveToPageMenu = track(function MoveToPageMenu() {
	const editor = useEditor()
	const pages = editor.getPages()
	const currentPageId = editor.getCurrentPageId()
	const { addToast } = useToasts()
	const actions = useActions()
	const trackEvent = useUiEvents()

	return (
		<TldrawUiMenuSubmenu id="move-to-page" label="context-menu.move-to-page">
			<TldrawUiMenuGroup id="pages">
				{pages.map((page) => (
					<TldrawUiMenuItem
						id={page.id}
						key={page.id}
						disabled={currentPageId === page.id}
						label={page.name}
						onSelect={() => {
							editor.mark('move_shapes_to_page')
							editor.moveShapesToPage(editor.getSelectedShapeIds(), page.id as TLPageId)

							const toPage = editor.getPage(page.id)

							if (toPage) {
								addToast({
									title: 'Changed Page',
									description: `Moved to ${toPage.name}.`,
									actions: [
										{
											label: 'Go Back',
											type: 'primary',
											onClick: () => {
												editor.mark('change-page')
												editor.setCurrentPage(currentPageId)
											},
										},
									],
								})
							}
							trackEvent('move-to-page', { source: 'context-menu' })
						}}
						title={page.name}
					/>
				))}
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="new-page">
				<TldrawUiMenuItem {...actions['new-page']} />
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
})
