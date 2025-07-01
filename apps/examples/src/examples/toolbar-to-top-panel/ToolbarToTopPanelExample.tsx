import { CenteredTopPanelContainer, DefaultToolbar, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// A component that renders the default toolbar inside the top panel container
function TopPanelComponent() {
	return (
		<CenteredTopPanelContainer>
			<DefaultToolbar />
		</CenteredTopPanelContainer>
	)
}

// Create a components map that disables the default bottom toolbar and instead uses our custom top-panel component
const components: TLComponents = {
	Toolbar: null,
	TopPanel: TopPanelComponent,
}

export default function ToolbarToTopPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="toolbar-to-top-panel-example" components={components} />
		</div>
	)
}