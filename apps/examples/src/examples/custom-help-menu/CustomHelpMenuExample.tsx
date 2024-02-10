import {
	CustomHelpMenu,
	DefaultHelpMenu,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function CustomContextMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<CustomHelpMenu>
					<DefaultHelpMenu />
					<CustomMenuItem />
				</CustomHelpMenu>
			</Tldraw>
		</div>
	)
}

function CustomMenuItem() {
	return (
		<TldrawUiMenuGroup id="custom stuff">
			<TldrawUiMenuItem
				actionItem={{
					id: 'about',
					label: 'Like my posts',
					icon: 'external-link',
					readonlyOk: true,
					onSelect() {
						window.open('https://x.com/tldraw', '_blank')
					},
				}}
			/>
		</TldrawUiMenuGroup>
	)
}
