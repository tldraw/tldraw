import { mockDocument, TldrawTestApp } from '~test'

describe('Create page command', () => {
  const app = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    app.loadDocument(mockDocument)

    const initialId = app.page.id
    const initialPageState = app.pageState

    app.createPage()

    const nextId = app.page.id
    const nextPageState = app.pageState

    expect(Object.keys(app.document.pages).length).toBe(2)
    expect(app.page.id).toBe(nextId)
    expect(app.pageState).toEqual(nextPageState)

    app.undo()

    expect(Object.keys(app.document.pages).length).toBe(1)
    expect(app.page.id).toBe(initialId)
    expect(app.pageState).toEqual(initialPageState)

    app.redo()

    expect(Object.keys(app.document.pages).length).toBe(2)
    expect(app.page.id).toBe(nextId)
    expect(app.pageState).toEqual(nextPageState)
  })
})
