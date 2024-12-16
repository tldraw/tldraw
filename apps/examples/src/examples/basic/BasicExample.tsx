import { useState } from 'react'
import { Tldraw, TldrawOptions } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	const [options, setOptions] = useState<Partial<TldrawOptions>>({
		maxPages: 3,
	})
	return (
		<>
			<button
				style={{ position: 'fixed', zIndex: 1000, top: 70 }}
				onClick={() => void setOptions({ maxPages: (options.maxPages ?? 0) + 1 })}
			>
				Change options
			</button>
			<div className="tldraw__editor" style={{ position: 'absolute', inset: 0 }}>
				<Tldraw persistenceKey="example" options={options}></Tldraw>
			</div>
		</>
	)
}
