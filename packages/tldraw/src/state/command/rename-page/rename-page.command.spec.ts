import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Rename page command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)

    const initialId = tlstate.page.id
    const initialName = tlstate.page.name

    tlstate.renamePage(initialId, 'My Special Page')

    expect(tlstate.page.name).toBe('My Special Page')

    tlstate.undo()

    expect(tlstate.page.name).toBe(initialName)

    tlstate.redo()

    expect(tlstate.page.name).toBe('My Special Page')
  })
})
