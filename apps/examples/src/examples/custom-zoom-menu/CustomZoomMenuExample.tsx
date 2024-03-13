import {
	DefaultZoomMenu,
	DefaultZoomMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomZoomMenu() {
	return (
		<DefaultZoomMenu>
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
			<DefaultZoomMenuContent />
		</DefaultZoomMenu>
	)
}

const components: TLComponents = {
	ZoomMenu: CustomZoomMenu,
}

export default function CustomZoomMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
