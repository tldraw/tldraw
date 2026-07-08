import { commentsPlugin, CommentToolbarItem } from '@tldraw/comments'
import { DefaultToolbar, DefaultToolbarContent, TLComponents, Tldraw } from 'tldraw'
import '@tldraw/comments/comments.css'
import 'tldraw/tldraw.css'

const plugins = [commentsPlugin()]

// The plugin registers the comment tool (keyboard shortcut `c`) but doesn't add a toolbar
// button. Compose its toolbar item into your own toolbar wherever you want it - first keeps it
// out of the overflow menu.
const components: TLComponents = {
	Toolbar: (props) => (
		<DefaultToolbar {...props}>
			<CommentToolbarItem />
			<DefaultToolbarContent />
		</DefaultToolbar>
	),
}

export default function CommentsPluginExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw persistenceKey="comments-plugin-example" plugins={plugins} components={components} />
		</div>
	)
}
