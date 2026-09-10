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
				<Tldraw persistenceKey="scroll-example" autoFocus={true} />
			</div>
		</div>
	)
}

/*
While the editor is focused it consumes wheel events to pan and zoom, so the page won't
scroll when the pointer is over the canvas. Try turning off `autoFocus` to see the
difference.
*/
