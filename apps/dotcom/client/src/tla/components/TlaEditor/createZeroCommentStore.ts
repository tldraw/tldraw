import { TLComment, TLShapeId, createCommentStore } from 'tldraw'
import { TldrawApp } from '../../app/TldrawApp'

/**
 * A {@link TLCommentStore} for one file, backed by tldraw.com's Zero store. Reads come from the
 * reactive `comments` synced query (filtered to this file); writes go through Zero mutators, which
 * enforce file access and set the author server-side. Comment data never enters the tldraw document
 * store, so it doesn't sync with the drawing and isn't affected by undo/redo.
 */
export function createZeroCommentStore(app: TldrawApp, fileId: string) {
	return createCommentStore({
		getComments: () =>
			app.getCommentsForFile(fileId).map(
				(c): TLComment => ({
					id: c.id,
					anchor: { type: 'shape', shapeId: c.shapeId as TLShapeId },
					authorId: c.authorId,
					author: c.author ? { name: c.author.name, avatarUrl: c.author.avatar } : undefined,
					text: c.text,
					createdAt: c.createdAt,
					updatedAt: c.updatedAt,
				})
			),
		create: ({ anchor, text }) => app.createComment(fileId, anchor.shapeId, text),
		delete: (id) => app.deleteComment(id),
	})
}
