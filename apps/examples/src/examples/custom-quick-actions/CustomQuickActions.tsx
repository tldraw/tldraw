import {
	Button,
	DefaultQuickActions,
	DefaultQuickActionsContent,
	TLComponents,
	Tldraw,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomQuickActions() {
	return (
		<DefaultQuickActions>
			<DefaultQuickActionsContent />
			<Button type="icon" icon="code" smallIcon />
		</DefaultQuickActions>
	)
}

const components: TLComponents = {
	QuickActions: CustomQuickActions, // null will hide the page menu instead
}

export default function CustomQuickActionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
