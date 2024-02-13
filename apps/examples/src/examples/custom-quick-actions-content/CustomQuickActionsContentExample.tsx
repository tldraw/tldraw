import { DefaultQuickActionsContent, TLComponents, Tldraw, TldrawUiMenuItem } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomQuickActionsContent() {
	return (
		<>
			<DefaultQuickActionsContent />
			<TldrawUiMenuItem
				id="about"
				label="Like my posts"
				icon="external-link"
				readonlyOk
				onSelect={() => {
					window.open('https://x.com/tldraw', '_blank')
				}}
			/>
		</>
	)
}

const components: TLComponents = {
	QuickActionsContent: CustomQuickActionsContent,
}

export default function CustomQuickActionsContentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
