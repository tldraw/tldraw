import { TLComponents, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

function CustomHelpMenu() {
	return (
		<button
			style={{
				position: 'absolute',
				bottom: 8,
				right: 8,
				pointerEvents: 'all',
			}}
		>
			halp
		</button>
	)
}

const components: TLComponents = {
	HelpMenu: CustomHelpMenu,
}

export default function CustomHelpMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}
