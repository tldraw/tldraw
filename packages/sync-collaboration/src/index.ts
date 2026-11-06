import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Server-side logic for tldraw's collaboration features, safe to import from any sync
// server — no react or client-editor dependencies.
export {
	type CommentAuthorizerOptions,
	type CommentModification,
	type CommentModificationAuthContext,
	createCommentAuthorizers,
} from './comment-authorizers'
export {
	COMMENT_TYPES,
	commentCommands,
	createOwnedShapesPolicy,
	createPageReadPolicy,
	getActorUserRecordId,
	getPageReaders,
	getRecordPageId,
	getShapeOwner,
	pageCommands,
	TLDRAW_PERMISSIONS,
	type OwnedShapesPolicyOptions,
} from './tldraw-commands'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
