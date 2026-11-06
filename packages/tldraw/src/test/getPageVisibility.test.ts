import {
	atom,
	createShapeId,
	createUserId,
	InstancePresenceRecordType,
	PageRecordType,
	react,
	TLPageId,
} from '@tldraw/editor'
import { TestEditor } from './TestEditor'

const page2 = PageRecordType.createId('page2')
const page3 = PageRecordType.createId('page3')

const hidden = atom<Set<TLPageId>>('hidden pages', new Set())

let editor: TestEditor

beforeEach(() => {
	hidden.set(new Set())
	editor = new TestEditor({
		getPageVisibility: (page) => (hidden.get().has(page.id) ? 'hidden' : 'visible'),
	})
	editor.createPage({ id: page2, name: 'Page 2' })
	editor.createPage({ id: page3, name: 'Page 3' })
})

describe('getPageVisibility option', () => {
	it('leaves hidden pages out of getVisiblePages, but not getPages', () => {
		hidden.set(new Set([page2]))
		expect(editor.getVisiblePages().map((p) => p.id)).toEqual([editor.getPages()[0].id, page3])
		expect(editor.getPages()).toHaveLength(3)
		expect(editor.isPageHidden(page2)).toBe(true)
		expect(editor.isPageHidden(page3)).toBe(false)
	})

	it('does not navigate to a hidden page', () => {
		hidden.set(new Set([page2]))
		const before = editor.getCurrentPageId()
		editor.setCurrentPage(page2)
		expect(editor.getCurrentPageId()).toBe(before)
		editor.setCurrentPage(page3)
		expect(editor.getCurrentPageId()).toBe(page3)
	})

	it('moves to the first visible page when the current page becomes hidden', () => {
		editor.setCurrentPage(page3)
		hidden.set(new Set([page3]))
		expect(editor.getCurrentPageId()).toBe(editor.getPages()[0].id)
	})

	it('stays on the current page when no page is visible', () => {
		editor.setCurrentPage(page3)
		hidden.set(new Set(editor.getPages().map((p) => p.id)))
		expect(editor.getCurrentPageId()).toBe(page3)
	})

	it('hides nothing without the option', () => {
		const plain = new TestEditor()
		expect(plain.isPageHidden(plain.getCurrentPageId())).toBe(false)
		expect(plain.getVisiblePages()).toEqual(plain.getPages())
	})
})

describe('page operations with hidden pages', () => {
	it('does not delete the last visible page', () => {
		const first = editor.getPages()[0].id
		hidden.set(new Set([page2, page3]))
		editor.deletePage(first)
		expect(editor.getPage(first)).toBeDefined()
	})

	it('moves to a visible neighbour when it deletes the current page', () => {
		const first = editor.getPages()[0].id
		hidden.set(new Set([page2]))
		editor.deletePage(first)
		expect(editor.getCurrentPageId()).toBe(page3)
	})

	it('leaves a hidden page without an undo step', () => {
		editor.setCurrentPage(page3)
		editor.markHistoryStoppingPoint()
		hidden.set(new Set([page3]))
		const first = editor.getPages()[0].id
		expect(editor.getCurrentPageId()).toBe(first)
		editor.undo()
		expect(editor.getCurrentPageId()).toBe(first)
	})

	it('does not move shapes to a hidden page', () => {
		const id = createShapeId('box')
		editor.createShapes([{ id, type: 'geo' }])
		hidden.set(new Set([page2]))
		editor.moveShapesToPage([id], page2)
		expect(editor.getShape(id)!.parentId).toBe(editor.getCurrentPageId())
		expect(editor.getPageShapeIds(page2).size).toBe(0)
	})
})

describe('duplicating a page into a hidden copy', () => {
	it('does not paste the copy onto the source page', () => {
		const copy = PageRecordType.createId('copy')
		hidden.set(new Set([copy]))
		const page = editor.getCurrentPageId()
		editor.createShapes([{ id: createShapeId('a'), type: 'geo' }])
		editor.duplicatePage(page, copy)
		expect(editor.getCurrentPageId()).toBe(page)
		expect(editor.getPageShapeIds(page).size).toBe(1)
	})
})

describe('following a user onto a hidden page', () => {
	it('stops following, and never shows the hidden page', () => {
		const leaderId = createUserId('leader')
		const presence = (currentPageId: TLPageId) =>
			InstancePresenceRecordType.create({
				id: InstancePresenceRecordType.createId(leaderId),
				userId: leaderId,
				userName: 'leader',
				currentPageId,
				camera: { x: 0, y: 0, z: 1 },
				screenBounds: { x: 0, y: 0, w: 1080, h: 720 },
				lastActivityTimestamp: Date.now(),
			})
		hidden.set(new Set([page2]))
		editor.store.put([presence(page3)])
		editor.startFollowingUser(leaderId)
		expect(editor.getCurrentPageId()).toBe(page3)

		const pages: TLPageId[] = []
		const stop = react('watch the current page', () => {
			pages.push(editor.getCurrentPageId())
		})
		editor.store.put([presence(page2)])
		stop()
		expect(pages).toEqual([page3])
		expect(editor.getInstanceState().followingUserId).toBeNull()
	})
})
