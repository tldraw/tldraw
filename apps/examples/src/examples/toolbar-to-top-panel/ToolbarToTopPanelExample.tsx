import { CenteredTopPanelContainer, DefaultToolbar, TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// Create a components object that hides the default Toolbar and renders it inside the TopPanel instead.
const components: TLComponents = {
	Toolbar: null,
	TopPanel: () => (
		<CenteredTopPanelContainer>
			<DefaultToolbar />
		</CenteredTopPanelContainer>
	),
}

export default function ToolbarToTopPanelExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="toolbar-to-top-panel-example" components={components} />
		</div>
	)
}