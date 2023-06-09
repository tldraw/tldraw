import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function MultipleExample() {
	return (
		<div
			style={{
				width: '120vw',
				height: '150vh',
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				backgroundImage: 'url(https://source.unsplash.com/random/2000x2000)',
			}}
		>
			<div style={{ width: '60vw', height: '80vh' }}>
				<Tldraw persistenceKey="steve" autoFocus />
			</div>

			<textarea defaultValue="type in me" style={{ margin: 10 }}></textarea>

			<div style={{ width: '60vw', height: '80vh' }}>
				<Tldraw persistenceKey="david" autoFocus={false} />
			</div>
		</div>
	)
}
