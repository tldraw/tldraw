import { CustomContextMenu, Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function CustomContextMenuExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<CustomContextMenu>
					<button className="tlui-button">Hello</button>
				</CustomContextMenu>
			</Tldraw>
		</div>
	)
}
