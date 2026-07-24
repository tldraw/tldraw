import { registerTldrawLibraryVersion } from '@tldraw/utils'

// Server-side commenting logic, safe to import from any sync server — no react or
// client-editor dependencies.
export { type CommentAuthorizerOptions, createCommentAuthorizers } from './comment-authorizers'

registerTldrawLibraryVersion(
	(globalThis as any).TLDRAW_LIBRARY_NAME,
	(globalThis as any).TLDRAW_LIBRARY_VERSION,
	(globalThis as any).TLDRAW_LIBRARY_MODULES
)
