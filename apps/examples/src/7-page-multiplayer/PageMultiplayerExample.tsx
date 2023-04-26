import { TLUser, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'

export default function Example() {
	return (
		<div style={{ display: 'flex' }}>
			<div style={{ width: '50vw', height: '100vh', borderRight: 'solid 1px black' }}>
				<Tldraw persistenceKey="test" autoFocus />
			</div>

			<div style={{ width: '50vw', height: '100vh' }}>
				<Tldraw userId={TLUser.createId()} persistenceKey="test" autoFocus={false} />
			</div>
		</div>
	)
}
