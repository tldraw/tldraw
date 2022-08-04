import { mockDocument, TldrawTestApp } from '~test'

describe('Duplicate page command', () => {
  const app = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    app.loadDocument(mockDocument)

    const initialId = app.page.id

    app.duplicatePage(app.currentPageId)

    const nextId = app.page.id

    app.undo()

    expect(app.page.id).toBe(initialId)

    app.redo()

    expect(app.page.id).toBe(nextId)
  })
})
