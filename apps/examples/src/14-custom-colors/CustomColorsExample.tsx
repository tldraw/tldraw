import { Tldraw, TldrawEditorConfig } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useEffect } from 'react'

const config = new TldrawEditorConfig({
	shapes: {},
})

export default function CustomColorsExample() {
	useEffect(() => {
		// set new CSS variable for "blueish" color
		document.body.style.setProperty('--palette-blueish', '#00f')
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw
				autoFocus
				config={config}
				overrides={{
					styles(app, styles) {
						styles.color[0].id = 'blueish'
						return styles
					},
				}}
			/>
		</div>
	)
}
