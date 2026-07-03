import { Signal, TLComment, TLCommentCreate, TLCommentStore, TLShapeId, computed } from 'tldraw'
import { TldrawApp } from '../../app/TldrawApp'

/**
 * A {@link TLCommentStore} backed by tldraw.com's Zero store. Reads come from the reactive
 * `comments` synced query (filtered to this file); writes go through Zero mutators, which enforce
 * file access and set the author server-side. Comment data never enters the tldraw document store,
 * so it doesn't sync with the drawing and isn't affected by undo/redo.
 */
export class ZeroCommentStore implements TLCommentStore {
	private readonly comments$: Signal<TLComment[]>

	constructor(
		private readonly app: TldrawApp,
		private readonly fileId: string
	) {
		this.comments$ = computed('file comments', () =>
			this.app.getCommentsForFile(this.fileId).map(
				(c): TLComment => ({
					id: c.id,
					anchor: { type: 'shape', shapeId: c.shapeId as TLShapeId },
					authorId: c.authorId,
					author: c.author ? { name: c.author.name, avatarUrl: c.author.avatar } : undefined,
					text: c.text,
					createdAt: c.createdAt,
					updatedAt: c.updatedAt,
				})
			)
		)
	}

	getCommentsForDocument() {
		return this.comments$
	}

	async create({ anchor, text }: TLCommentCreate) {
		if (anchor.type !== 'shape') return
		await this.app.createComment(this.fileId, anchor.shapeId, text)
	}

	async delete(id: string) {
		await this.app.deleteComment(id)
	}
}
