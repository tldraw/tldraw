import { Tldraw, TldrawOptions } from 'tldraw'
import 'tldraw/tldraw.css'

const options: Partial<TldrawOptions> = {
	maxPages: 3,
	animationMediumMs: 5000,
}

export default function CustomOptionsExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="example" options={options} />
		</div>
	)
}
