import {
	DefaultMainMenu,
	DefaultMainMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomMainMenu() {
	return (
		<DefaultMainMenu>
			<TldrawUiMenuGroup id="example">
				<TldrawUiMenuItem
					id="like"
					label="Like my posts"
					icon="external-link"
					readonlyOk
					onSelect={() => {
						window.open('https://x.com/tldraw', '_blank')
					}}
				/>
			</TldrawUiMenuGroup>
			<DefaultMainMenuContent />
		</DefaultMainMenu>
	)
}

const components: TLComponents = {
	MainMenu: CustomMainMenu,
}

export default function CustomMainMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
