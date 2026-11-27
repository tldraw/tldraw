// This module is part of the headless core. It must not import React or touch the DOM.
import { PageRecordType, TLPage, TLPageId } from '@tldraw/tlschema'
import { getIndexAbove } from '@tldraw/utils'
import type { Editor } from '../../editor/Editor'
import { RequiredKeys } from '../../editor/types/misc-types'
import { getIncrementedName } from '../../utils/getIncrementedName'

/**
 * Creates, updates, renames and deletes pages. The editor's `createPage`, `updatePage`, `renamePage`
 * and `deletePage` use it.
 *
 * @public
 */
export class PageController {
	constructor(private readonly editor: Editor) {}

	updatePage(partial: RequiredKeys<Partial<TLPage>, 'id'>): void {
		if (this.editor.getIsReadonly()) return

		const prev = this.editor.getPage(partial.id)
		if (!prev) return

		this.editor.run(() => this.editor.store.update(partial.id, (page) => ({ ...page, ...partial })))
	}

	createPage(page: Partial<TLPage>): void {
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
	}

	deletePage(page: TLPageId | TLPage): void {
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
	}

	renamePage(page: TLPageId | TLPage, name: string): void {
		const id = typeof page === 'string' ? page : page.id
		if (this.editor.getIsReadonly()) return
		this.updatePage({ id, name })
	}
}
