import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

const customColors: string[] = ['#4285F4', '#EA4335', '#FBBC05', '#34A853']

export default function CustomColorsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="tldraw_example" customColors={customColors} autoFocus />
		</div>
	)
}
