import {
	DefaultZoomMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomZoomMenuContent() {
	return (
		<>
			<TldrawUiMenuGroup id="normal stuff">
				<DefaultZoomMenuContent />
			</TldrawUiMenuGroup>
			<TldrawUiMenuGroup id="custom stuff">
				<TldrawUiMenuItem
					id="about"
					label="Like my posts"
					icon="external-link"
					readonlyOk
					onSelect={() => {
						window.open('https://x.com/tldraw', '_blank')
					}}
				/>
			</TldrawUiMenuGroup>
		</>
	)
}

const components: TLComponents = {
	ZoomMenuContent: CustomZoomMenuContent,
}

export default function CustomZoomMenuContentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
