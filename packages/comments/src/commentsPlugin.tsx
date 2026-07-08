import { TldrawPlugin } from 'tldraw'
import { CommentsProvider } from './CommentsContext'
import { commentSchemaRecords } from './records'
import { CommentsPluginOptions } from './types'
import { CommentsOnCanvas } from './ui/CommentsOnCanvas'

export type { CommentsPluginOptions, CommentsPluginUser, TLCommentsComponents } from './types'

/**
 * Comments for the tldraw SDK. Pass to `<Tldraw plugins={[commentsPlugin()]}>` and, when using
 * sync, to `useSync({ plugins })` on the client and `commentsSyncPlugin()` on the server.
 *
 * @public
 */
export function commentsPlugin(options: CommentsPluginOptions = {}): TldrawPlugin {
	return {
		id: 'tldraw.comments',
		records: commentSchemaRecords,
		components: {
			InFrontOfTheCanvas: function CommentsPluginOverlay() {
				return (
					<CommentsProvider options={options}>
						<CommentsOnCanvas />
					</CommentsProvider>
				)
			},
		},
	}
}
