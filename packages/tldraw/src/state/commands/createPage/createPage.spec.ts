import { TldrawTestApp, mockDocument } from '~test'

let app: TldrawTestApp

beforeEach(() => {
  app = new TldrawTestApp()
})

function createPageWithName(app: TldrawTestApp) {
  const pageName = 'Page' + ' ' + (Object.keys(app.document.pages).length + 1)
  app.createPage(undefined, pageName)
}

describe('Create page command', () => {
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

    createPageWithName(app)

    expect(app.page.name).toBe('Page 2')

    createPageWithName(app)

    expect(app.page.name).toBe('Page 3')

    app.deletePage(app.page.id)

    createPageWithName(app)

    expect(app.page.name).toBe('Page 3')

    createPageWithName(app)

    expect(app.page.name).toBe('Page 4')

    app.renamePage(app.page.id, 'Page!')

    createPageWithName(app)

    expect(app.page.name).toBe('Page 5')

    app.renamePage(app.page.id, 'Page 6')

    createPageWithName(app)

    expect(app.page.name).toBe('Page 7')
  })
})

describe('when the page name exists', () => {
  it('when others is empty', () => {
    app.loadDocument(mockDocument)
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple')
  })

  it('when others has no match', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple')
  })

  it('when others has one match', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple 1')
  })

  it('when others has two matches', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    app.createPage(undefined, 'Apple 1')
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple 2')
  })

  it('when others has a near match', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    app.createPage(undefined, 'Apple ()')
    app.createPage(undefined, 'Apples')
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple 1')
  })

  it('when others has a near match', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    app.createPage(undefined, 'Apple 1!')
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple 1')
  })

  it('when others has a near match', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    app.createPage(undefined, 'Apple 1!')
    app.createPage(undefined, 'Apple 1!')
    expect(app.page.name).toBe('Apple 1! 1')
  })

  it('when others has a near match', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    app.createPage(undefined, 'Apple 1')
    app.createPage(undefined, 'Apple 2')
    app.createPage(undefined, 'Apple 3')
    app.createPage(undefined, 'Apple 5')
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple 4')
  })

  it('when others has a near match', () => {
    app.createPage(undefined, 'Orange')
    app.createPage(undefined, 'Apple')
    app.createPage(undefined, 'Apple 1')
    app.createPage(undefined, 'Apple 2')
    app.createPage(undefined, 'Apple 3')
    app.createPage(undefined, 'Apple 4')
    app.createPage(undefined, 'Apple 5')
    app.createPage(undefined, 'Apple 6')
    app.createPage(undefined, 'Apple 7')
    app.createPage(undefined, 'Apple 8')
    app.createPage(undefined, 'Apple 9')
    app.createPage(undefined, 'Apple 10')
    app.createPage(undefined, 'Apple')
    expect(app.page.name).toBe('Apple 11')
  })
})
