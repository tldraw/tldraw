import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Create page command', () => {
  const state = new TLDrawState()

  it('does, undoes and redoes command', () => {
    state.loadDocument(mockDocument)

    const initialId = state.page.id
    const initialPageState = state.pageState

    state.createPage()

    const nextId = state.page.id
    const nextPageState = state.pageState

    expect(Object.keys(state.document.pages).length).toBe(2)
    expect(state.page.id).toBe(nextId)
    expect(state.pageState).toEqual(nextPageState)

    state.undo()

    expect(Object.keys(state.document.pages).length).toBe(1)
    expect(state.page.id).toBe(initialId)
    expect(state.pageState).toEqual(initialPageState)

    state.redo()

    expect(Object.keys(state.document.pages).length).toBe(2)
    expect(state.page.id).toBe(nextId)
    expect(state.pageState).toEqual(nextPageState)
  })
})
