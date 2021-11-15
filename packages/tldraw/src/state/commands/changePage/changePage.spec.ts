import { mockDocument, TLDrawTestApp } from '~test'

describe('Change page command', () => {
  const state = new TLDrawTestApp()

  it('does, undoes and redoes command', () => {
    state.loadDocument(mockDocument)

    const initialId = state.page.id

    state.createPage()

    const nextId = state.page.id

    state.changePage(initialId)

    expect(state.page.id).toBe(initialId)

    state.changePage(nextId)

    expect(state.page.id).toBe(nextId)

    state.undo()

    expect(state.page.id).toBe(initialId)

    state.redo()

    expect(state.page.id).toBe(nextId)
  })
})
