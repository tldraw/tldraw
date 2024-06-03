import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function ScrollExample() {
	return (
		<div
			style={{
				width: '150vw',
				height: '150vh',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				backgroundColor: '#fff',
			}}
		>
			<div style={{ width: '60vw', height: '80vh' }}>
				<Tldraw persistenceKey="scroll-example" />
			</div>
		</div>
	)
}

/*
This example shows how you can use the Tldraw component inside a scrollable container. 
The component will still accept mousewheel events while "focused". Try turning off the
autoFocus prop to see the difference.
*/
