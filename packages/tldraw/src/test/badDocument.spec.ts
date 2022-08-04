import { TldrawTestApp } from './TldrawTestApp'
import { badDocument } from './documents/badDocument'

describe('When loading a bad document', () => {
  it('Fixes the document', () => {
    const app = new TldrawTestApp()

    global.console.warn = jest.fn()

    // This doc has parents that are missing and children set to missing shapes
    app.loadDocument(badDocument as any)

    for (const pageId in app.document.pages) {
      const page = app.document.pages[pageId]
      for (const shape of Object.values(page.shapes)) {
        if (shape.parentId === pageId) continue
        expect(page.shapes[shape.parentId]).toBeDefined()
      }
    }

    expect(app.getShape('rect2').parentId).toBe('page1')
    expect(app.getShape('group1').children!.length).toBe(0)

    expect(global.console.warn).toHaveBeenCalled()
  })
})
