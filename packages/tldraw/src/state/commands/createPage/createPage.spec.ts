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

  it('increments page names', () => {
    app.loadDocument(mockDocument)

    app.createPage()

    expect(app.page.name).toBe('New page')

    app.createPage()

    expect(app.page.name).toBe('New page (1)')

    app.createPage()

    expect(app.page.name).toBe('New page (2)')

    app.renamePage(app.page.id, 'New page!')

    app.createPage()

    expect(app.page.name).toBe('New page (2)')

    app.deletePage(app.page.id)

    expect(app.page.name).toBe('New page!')

    app.createPage(undefined, 'New page!')

    expect(app.page.name).toBe('New page! (1)')
  })
})
