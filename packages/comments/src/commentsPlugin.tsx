import { Editor, FLAGS, TldrawPlugin, useEditor } from 'tldraw'
import { commentToolComponents, commentToolOverrides, commentTools } from './canvas/comment-tool'
import { CanvasComments } from './canvas/comments-overlay'
import { CanvasCommentsSidebar } from './canvas/comments-sidebar'
import { commentSchemaRecords } from './records'
import { CommentsPluginOptions, CommentsPluginUser } from './types'

export type { CommentsPluginOptions, CommentsPluginUser } from './types'

function defaultUser(editor: Editor): CommentsPluginUser | null {
	const id = editor.user.getExternalId()
	return id ? { id, name: editor.user.getName() } : null
}

function defaultResolveName(userId: string): string {
	return userId
}

/**
 * Comments for the tldraw SDK. Pass to `<Tldraw plugins={[commentsPlugin()]}>` and, when using
 * sync, to `useSync({ plugins })` on the client and `commentsSyncPlugin()` on the server.
 *
 * @public
 */
export function commentsPlugin(options: CommentsPluginOptions = {}): TldrawPlugin {
	const resolveName = options.resolveName ?? defaultResolveName
	const showSidebar = options.sidebar ?? true

	return {
		id: 'tldraw.comments',
		records: commentSchemaRecords,
		requiredLicenseFlags: FLAGS.COMMENTS_PLUGIN,
		tools: commentTools,
		overrides: commentToolOverrides,
		components: {
			...commentToolComponents,
			InFrontOfTheCanvas: function CommentsPluginOverlay() {
				return (
					<CommentsPluginOverlayInner
						userResolver={options.user}
						resolveName={resolveName}
						showSidebar={showSidebar}
					/>
				)
			},
		},
	}
}

function CommentsPluginOverlayInner({
	userResolver,
	resolveName,
	showSidebar,
}: {
	userResolver?(editor: Editor): CommentsPluginUser | null
	resolveName(userId: string): string
	showSidebar: boolean
}) {
	const editor = useEditor()
	const user = userResolver ? userResolver(editor) : defaultUser(editor)
	const currentUserId = user?.id ?? null
	return (
		<>
			<CanvasComments currentUserId={currentUserId} resolveName={resolveName} />
			{showSidebar && <CanvasCommentsSidebar resolveName={resolveName} />}
		</>
	)
}
