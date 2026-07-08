import { Editor } from 'tldraw'

/** @public */
export interface CommentsPluginUser {
	id: string
	name?: string
}

/** @public */
export interface CommentsPluginOptions {
	/**
	 * Resolves the current user for authoring comments. Return null to disable composing
	 * (existing comments stay visible). Defaults to the editor's user preferences identity, which
	 * always exists—including for anonymous local sessions (a locally generated stable id). The
	 * default is therefore not auth-gated; pass your own user resolver returning null to hide the
	 * composer for unauthenticated users. When using tldraw sync, the server additionally gates
	 * comment writes per session via objectAccess.
	 */
	user?(editor: Editor): CommentsPluginUser | null
	/** Maps an author id to a display name. Defaults to the id itself. */
	resolveName?(userId: string): string
	/** Whether to render the comments sidebar alongside the canvas overlay. Defaults to true. */
	sidebar?: boolean
}
