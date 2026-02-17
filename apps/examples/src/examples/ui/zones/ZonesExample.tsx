import { TLComponents, Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

// There's a guide at the bottom of this file!

const components: TLComponents = {
	SharePanel: CustomShareZone,
	TopPanel: CustomTopZone,
}

// [1]
export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

// [2]
function CustomTopZone() {
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
			<p>Top Zone</p>
		</div>
	)
}

// [3]
function CustomShareZone() {
	return (
		<div
			style={{
				backgroundColor: 'thistle',
				width: '100%',
				textAlign: 'center',
				minWidth: '80px',
			}}
		>
			<p>Share Zone</p>
		</div>
	)
}

/* 
This example shows how to pass in a custom component to the share panel and top panel.
The share panel is in the top right corner above the style menu, the top panel is in 
the top center.

[1]
We pass in our custom components to the Tldraw topZone and shareZone props.

[2]
This is the component that will be rendered in the top zone.

[3]
This is the component that will be rendered in the share zone.
*/
