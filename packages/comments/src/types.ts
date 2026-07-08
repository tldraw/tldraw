import { ComponentType } from 'react'
import { Editor, TLShapeId } from 'tldraw'
import { TLCommentThread } from './records'

/** @public */
export interface CommentsPluginUser {
	id: string
	name?: string
}

/** @public */
export interface TLCommentsComponents {
	ThreadPin: ComponentType<{ thread: TLCommentThread }>
	ThreadComposer: ComponentType<{ shapeId: TLShapeId }>
}

/** @public */
export interface CommentsPluginOptions {
	/**
	 * Resolves the current user for authoring comments. Return null to disable composing
	 * (existing comments stay visible). Defaults to the editor's user preferences identity.
	 */
	user?(editor: Editor): CommentsPluginUser | null
	/** Override individual pieces of the default comments UI. */
	components?: Partial<TLCommentsComponents>
}
