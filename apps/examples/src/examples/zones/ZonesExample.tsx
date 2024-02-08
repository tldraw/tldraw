import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

// There's a guide at the bottom of this file!

// [1]
export default function Example() {
	return (
		<div className="tldraw__editor">
			<Tldraw topZone={<CustomTopZone />} shareZone={<CustomShareZone />} />
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
This example shows how to pass in a custom component to the share zone and top zone.
The share zone is in the top right corner above the style menu, the top zone is in 
the top center.

[1]
We pass in our custom components to the Tldraw topZone and shareZone props.

[2]
This is the component that will be rendered in the top zone.

[3]
This is the component that will be rendered in the share zone.
*/
