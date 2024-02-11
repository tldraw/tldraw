import { DefaultHelpMenuContent, Tldraw, TldrawUiMenuGroup, TldrawUiMenuItem } from '@tldraw/tldraw'
import { TLUiComponents } from '@tldraw/tldraw/src/lib/ui/hooks/useTldrawUiComponents'
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

const uiComponents: TLUiComponents = {
	HelpMenuContent: CustomHelpMenuContent,
}

export default function CustomHelpMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw uiComponents={uiComponents} />
		</div>
	)
}
