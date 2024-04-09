import {
	DefaultDebugMenu,
	DefaultDebugMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomDebugMenu() {
	return (
		<div style={{ backgroundColor: 'thistle' }}>
			<DefaultDebugMenu>
				<DefaultDebugMenuContent />
				<div style={{ backgroundColor: 'thistle' }}>
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
				</div>
			</DefaultDebugMenu>
		</div>
	)
}

const components: TLComponents = {
	DebugMenu: CustomDebugMenu,
}

export default function CustomDebugMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
