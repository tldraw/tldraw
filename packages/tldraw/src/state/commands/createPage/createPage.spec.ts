import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Create page command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)

    const initialId = tlstate.page.id
    const initialPageState = tlstate.pageState

    tlstate.createPage()

    const nextId = tlstate.page.id
    const nextPageState = tlstate.pageState

    expect(Object.keys(tlstate.document.pages).length).toBe(2)
    expect(tlstate.page.id).toBe(nextId)
    expect(tlstate.pageState).toEqual(nextPageState)

    tlstate.undo()

    expect(Object.keys(tlstate.document.pages).length).toBe(1)
    expect(tlstate.page.id).toBe(initialId)
    expect(tlstate.pageState).toEqual(initialPageState)

    tlstate.redo()

    expect(Object.keys(tlstate.document.pages).length).toBe(2)
    expect(tlstate.page.id).toBe(nextId)
    expect(tlstate.pageState).toEqual(nextPageState)
  })
})
