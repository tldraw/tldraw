import { describe, expect, it, vi } from 'vitest'
import { applyView, ViewEditor } from './applyView'

function fakeEditor(pageIds: string[]) {
	return {
		getPage: vi.fn((id: string) => (pageIds.includes(id) ? { id } : undefined)),
		getPages: vi.fn(() => pageIds.map((id) => ({ id }))),
		setCurrentPage: vi.fn(),
		setCamera: vi.fn(),
		zoomToFit: vi.fn(),
	} as unknown as ViewEditor & Record<string, ReturnType<typeof vi.fn>>
}

describe('applyView', () => {
	it('keeps page and camera when the page exists', () => {
		const editor = fakeEditor(['page:a', 'page:b'])
		applyView(editor, { pageId: 'page:b' as any, camera: { x: 1, y: 2, z: 3 } as any })
		expect(editor.setCurrentPage).toHaveBeenCalledWith('page:b')
		expect(editor.setCamera).toHaveBeenCalledWith({ x: 1, y: 2, z: 3 })
		expect(editor.zoomToFit).not.toHaveBeenCalled()
	})

	it('falls back to first page and fits when the page is missing', () => {
		const editor = fakeEditor(['page:a'])
		applyView(editor, { pageId: 'page:gone' as any, camera: { x: 1, y: 2, z: 3 } as any })
		expect(editor.setCurrentPage).toHaveBeenCalledWith('page:a')
		expect(editor.setCamera).not.toHaveBeenCalled()
		expect(editor.zoomToFit).toHaveBeenCalled()
	})
})
