import { mockDocument, TldrawTestApp } from '~test'

describe('Rename page command', () => {
  const app = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    app.loadDocument(mockDocument)

    const initialId = app.page.id
    const initialName = app.page.name

    app.renamePage(initialId, 'My Special Page')

    expect(app.page.name).toBe('My Special Page')

    app.undo()

    expect(app.page.name).toBe(initialName)

    app.redo()

    expect(app.page.name).toBe('My Special Page')
  })
})
