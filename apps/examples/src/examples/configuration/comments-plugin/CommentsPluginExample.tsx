import { commentsPlugin } from '@tldraw/comments'
import { Tldraw } from 'tldraw'
import '@tldraw/comments/comments.css'
import 'tldraw/tldraw.css'

const plugins = [commentsPlugin()]

export default function CommentsPluginExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="comments-plugin-example" plugins={plugins} />
		</div>
	)
}
