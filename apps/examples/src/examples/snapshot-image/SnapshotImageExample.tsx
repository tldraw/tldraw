import { Tldraw, TldrawImage } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'
import { useState } from 'react'

export default function SnapshotImageExample() {
	const [showImage, setShowImage] = useState(true)
	return (
		<div style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div style={{ display: 'flex', gap: 5 }}>
				<input
					id="toggle-image-checkbox"
					type="checkbox"
					checked={showImage}
					onChange={(e) => setShowImage(e.target.checked)}
				/>
				<label htmlFor="toggle-image-checkbox" style={{ userSelect: 'none' }}>
					Toggle snapshot image
				</label>
			</div>
			<div style={{ width: 600, height: 400 }}>
				{showImage ? (
					<TldrawImage persistenceKey="snapshot-image" />
				) : (
					<Tldraw persistenceKey="snapshot-image" />
				)}
			</div>
		</div>
	)
}
