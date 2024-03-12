import {
	DefaultActionsMenu,
	DefaultActionsMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuItem,
} from 'tldraw'
import 'tldraw/tldraw.css'

function CustomActionsMenu() {
	return (
		<div style={{ backgroundColor: 'thistle' }}>
			<DefaultActionsMenu>
				<div style={{ backgroundColor: 'thistle' }}>
					<TldrawUiMenuItem
						id="like"
						label="Like my posts"
						icon="external-link"
						readonlyOk
						onSelect={() => {
							window.open('https://x.com/tldraw', '_blank')
						}}
					/>
				</div>
				<DefaultActionsMenuContent />
			</DefaultActionsMenu>
		</div>
	)
}

const components: TLComponents = {
	ActionsMenu: CustomActionsMenu,
}

export default function CustomActionsMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
