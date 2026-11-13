import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Server-side logic for tldraw's collaboration features, safe to import from any sync
// server — no react or client-editor dependencies.
export {
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	type CommentAuthorizerOptions,
	type CommentRuleOptions,
	type CommentModification,
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	type CommentModificationAuthContext,
	type CommentModificationRuleContext,
	createCommentRule,
	// eslint-disable-next-line @typescript-eslint/no-deprecated
	createCommentAuthorizers,
	isCommentRecord,
	type TLCommentRecord,
} from './comment-authorizers'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
