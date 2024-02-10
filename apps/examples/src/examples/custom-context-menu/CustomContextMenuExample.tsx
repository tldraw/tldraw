import { Tldraw } from '@tldraw/tldraw'
import { ContextMenuContent } from '@tldraw/tldraw/src/lib/ui/components/ContextMenu'
import '@tldraw/tldraw/tldraw.css'

export default function CustomContextMenu() {
	return (
		<div className="tldraw__editor">
			<Tldraw>
				<ContextMenuContent>
					<button className="tlui-button">Hello</button>
				</ContextMenuContent>
			</Tldraw>
		</div>
	)
}
