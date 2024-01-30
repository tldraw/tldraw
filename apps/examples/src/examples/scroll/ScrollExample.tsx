import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

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
			<Tldraw persistenceKey="scroll-example" style={{ width: '60vw', height: '80vh' }} />
		</div>
	)
}

/*	
This example shows how you can use the Tldraw component inside a scrollable container.	
*/
