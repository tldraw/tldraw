import type { Computed } from '@tldraw/state'
import { computed } from '@tldraw/state'
import { PageRecordType, TLPage, TLPageId, TLShapeId } from '@tldraw/tlschema'
import { getIndexAbove, getIndexBetween, sortByIndex } from '@tldraw/utils'
import { getIncrementedName } from '../../../utils/getIncrementedName'
import type { Editor } from '../../Editor'
import { RequiredKeys } from '../../types/misc-types'
import { EditorManager } from '../EditorManager'

/**
 * Pages: lookup, the current page, and creating, updating, deleting and duplicating pages.
 *
 * @internal
 */
export class PagesManager extends EditorManager {
	/* --------------------- Pages ---------------------- */

	@computed _getAllPagesQuery() {
		return this.editor.store.query.records('page')
	}

	@computed getPages(): TLPage[] {
		return Array.from(this._getAllPagesQuery().get()).sort(sortByIndex)
	}

	getCurrentPage(): TLPage {
		return this.editor.getPage(this.editor.getCurrentPageId())!
	}

	@computed getCurrentPageId(): TLPageId {
		return this.editor.getInstanceState().currentPageId
	}

	getPage(page: TLPageId | TLPage): TLPage | undefined {
		return this.editor.store.get(typeof page === 'string' ? page : page.id)
	}

	/* @internal */
	_currentPageShapeIds!: Computed<Set<TLShapeId>>

	getCurrentPageShapeIds() {
		return this._currentPageShapeIds.get()
	}

	@computed
	getCurrentPageShapeIdsSorted() {
		return Array.from(this.editor.getCurrentPageShapeIds()).sort()
	}

	getPageShapeIds(page: TLPageId | TLPage): Set<TLShapeId> {
		const pageId = typeof page === 'string' ? page : page.id
		const result = this.editor.store.query.exec('shape', { parentId: { eq: pageId } })
		return this.editor.getShapeAndDescendantIds(result.map((s) => s.id))
	}

	setCurrentPage(page: TLPageId | TLPage): Editor {
		const pageId = typeof page === 'string' ? page : page.id
		if (!this.editor.store.has(pageId)) {
			console.error("Tried to set the current page id to a page that doesn't exist.")
			return this.editor
		}

		this.editor.stopFollowingUser()
		// finish off any in-progress interactions
		this.editor.complete()

		return this.editor.run(
			() => {
				this.editor.store.put([{ ...this.editor.getInstanceState(), currentPageId: pageId }])
				// ensure camera constraints are applied
				this.editor.setCamera(this.editor.getCamera())
			},
			{ history: 'record-preserveRedoStack' }
		)
	}

	updatePage(partial: RequiredKeys<Partial<TLPage>, 'id'>): Editor {
		if (this.editor.getIsReadonly()) return this.editor

		const prev = this.editor.getPage(partial.id)
		if (!prev) return this.editor

		return this.editor.run(() =>
			this.editor.store.update(partial.id, (page) => ({ ...page, ...partial }))
		)
	}

	createPage(page: Partial<TLPage>): Editor {
		this.editor.run(() => {
			if (this.editor.getIsReadonly()) return
			if (this.editor.getPages().length >= this.editor.options.maxPages) return
			const pages = this.editor.getPages()

			const name = getIncrementedName(
				page.name ?? 'Page 1',
				pages.map((p) => p.name)
			)

			let index = page.index

			if (!index || pages.some((p) => p.index === index)) {
				index = getIndexAbove(pages[pages.length - 1].index)
			}

			const newPage = PageRecordType.create({
				meta: {},
				...page,
				name,
				index,
			})

			this.editor.store.put([newPage])
		})
		return this.editor
	}

	deletePage(page: TLPageId | TLPage): Editor {
		const id = typeof page === 'string' ? page : page.id
		this.editor.run(
			() => {
				if (this.editor.getIsReadonly()) return
				const pages = this.editor.getPages()
				if (pages.length === 1) return

				const deletedPage = this.editor.getPage(id)
				if (!deletedPage) return

				if (id === this.editor.getCurrentPageId()) {
					const index = pages.findIndex((page) => page.id === id)
					const next = pages[index - 1] ?? pages[index + 1]
					this.editor.setCurrentPage(next.id)
				}

				const shapes = this.editor.getSortedChildIdsForParent(deletedPage.id)
				this.editor.deleteShapes(shapes)

				this.editor.store.remove([deletedPage.id])
			},
			{ ignoreShapeLock: true }
		)
		return this.editor
	}

	duplicatePage(page: TLPageId | TLPage, createId: TLPageId = PageRecordType.createId()): Editor {
		if (this.editor.getPages().length >= this.editor.options.maxPages) return this.editor
		const id = typeof page === 'string' ? page : page.id
		const freshPage = this.editor.getPage(id) // get the most recent version of the page anyway
		if (!freshPage) return this.editor

		const prevCamera = { ...this.editor.getCamera() }
		const content = this.editor.getContentFromCurrentPage(
			this.editor.getSortedChildIdsForParent(freshPage.id)
		)

		this.editor.run(() => {
			const pages = this.editor.getPages()
			const index = getIndexBetween(freshPage.index, pages[pages.indexOf(freshPage) + 1]?.index)

			// create the page (also creates the pagestate and camera for the new page)
			this.editor.createPage({ name: freshPage.name + ' Copy', id: createId, index })
			// set the new page as the current page
			this.editor.setCurrentPage(createId)
			// update the new page's camera to the previous page's camera
			this.editor.setCamera(prevCamera)

			if (content) {
				// If we had content on the previous page, put it on the new page
				return this.editor.putContentOntoCurrentPage(content)
			}
		})

		return this.editor
	}

	renamePage(page: TLPageId | TLPage, name: string) {
		const id = typeof page === 'string' ? page : page.id
		if (this.editor.getIsReadonly()) return this.editor
		this.editor.updatePage({ id, name })
		return this.editor
	}
}
