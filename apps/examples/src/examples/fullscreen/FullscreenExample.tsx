import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function FullscreenExample() {
	return <Tldraw persistenceKey="scroll-example" style={{ width: '100%', height: '100%' }} />
}

/*	
This example shows how you can make the Tldraw component fill its parent container.
*/
