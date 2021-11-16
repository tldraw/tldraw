import { mockDocument, TldrawTestApp } from '~test'

describe('Rename page command', () => {
  const state = new TldrawTestApp()

  it('does, undoes and redoes command', () => {
    state.loadDocument(mockDocument)

    const initialId = state.page.id
    const initialName = state.page.name

    state.renamePage(initialId, 'My Special Page')

    expect(state.page.name).toBe('My Special Page')

    state.undo()

    expect(state.page.name).toBe(initialName)

    state.redo()

    expect(state.page.name).toBe('My Special Page')
  })
})
