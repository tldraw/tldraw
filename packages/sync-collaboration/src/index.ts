import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Permission rules for tldraw's collaboration features. They run on the sync server and in the
// client's editor, so they have no react or client-editor dependencies.
export {
	type CommentModification,
	type CommentModificationContext,
	type CommentRuleOptions,
	commentRules,
	stampCommentAuthors,
} from './comment-rules'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
