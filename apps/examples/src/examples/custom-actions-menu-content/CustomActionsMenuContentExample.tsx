import {
	DefaultActionsMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomActionsMenuContent() {
	return (
		<>
			<DefaultActionsMenuContent />
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
	ActionsMenuContent: CustomActionsMenuContent,
}

export default function CustomActionsMenuContentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
