import {
	DefaultHelpMenuContent,
	TLComponents,
	Tldraw,
	TldrawUiMenuGroup,
	TldrawUiMenuItem,
} from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomHelpMenuContent() {
	return (
		<>
			<DefaultHelpMenuContent />
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
	HelpMenuContent: CustomHelpMenuContent,
}

export default function CustomHelpMenuContentExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
