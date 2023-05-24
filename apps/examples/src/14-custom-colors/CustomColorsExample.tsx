import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/editor.css'
import '@tldraw/tldraw/ui.css'
import { useEffect } from 'react'

export default function Example() {
	useEffect(() => {
		// set new CSS variable for "blueish" color
		document.body.style.setProperty('--palette-blueish', '#03f')
		document.body.style.setProperty('--palette-greenish', '#0d0')
	}, [])

	return (
		<div className="tldraw__editor">
			<Tldraw
				validate={false}
				autoFocus
				overrides={{
					styles(app, styles) {
						return {
							...styles,
							color: [
								...styles.color,
								{
									id: 'blueish',
									color: '#00f',
									icon: 'color',
								},
								{
									id: 'greenish',
									color: '#0f0',
									icon: 'color',
								},
							],
						}
					},
				}}
			/>
		</div>
	)
}
