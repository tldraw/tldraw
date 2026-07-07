import { Tldraw } from 'tldraw'
import { commentToolComponents, commentToolOverrides, commentTools } from '../../comment-tool'
import './editor-toolbar.css'

/** The editor toolbar with a comment tool, in a focused editor — shown per viewport
 * so the toolbar's own responsive layout is visible. */
export function EditorToolbar() {
	return (
		<div className="toolbar-scene">
			<Tldraw
				tools={commentTools}
				overrides={commentToolOverrides}
				components={commentToolComponents}
			/>
		</div>
	)
}
