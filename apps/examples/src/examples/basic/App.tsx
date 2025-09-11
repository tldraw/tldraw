import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function BasicExample() {
	return (
		<div className="editor">
			<Tldraw
				onMount={(editor) => {
					editor.selectAll()
				}}
			/>
		</div>
	)
}
