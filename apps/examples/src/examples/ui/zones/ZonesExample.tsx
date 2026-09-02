import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
function CustomTopPanel() {
	return (
		<div
			style={{
				backgroundColor: 'thistle',
				width: '100%',
				textAlign: 'center',
				padding: '2px',
				minWidth: '80px',
			}}
		>
			<p>Top panel</p>
		</div>
	)
}

// [2]
function CustomSharePanel() {
	return (
		<div
			style={{
				backgroundColor: 'thistle',
				width: '100%',
				textAlign: 'center',
				minWidth: '80px',
			}}
		>
			<p>Share panel</p>
		</div>
	)
}

const components: TLComponents = {
	SharePanel: CustomSharePanel,
	TopPanel: CustomTopPanel,
}

export default function ZonesExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
The default UI leaves two slots empty for you to fill: `TopPanel` in the top
center of the screen, and `SharePanel` in the top right, above the style panel.
Both are set through the `components` prop like any other slot.

[1]
Rendered in the top center. tldraw.com uses this slot for the document title.

[2]
Rendered in the top right. tldraw.com uses this slot for the share button and
collaborator avatars.
*/
