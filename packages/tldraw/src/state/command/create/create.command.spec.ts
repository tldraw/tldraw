import { TLDrawState } from '~state'
import { mockDocument } from '~test-utils'

describe('Create command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    const shape = { ...tlstate.getShape('rect1'), id: 'rect4' }
    tlstate.create(shape)

    expect(tlstate.getShape('rect4')).toBeTruthy()

    tlstate.undo()

    expect(tlstate.getShape('rect4')).toBe(undefined)

    tlstate.redo()

    expect(tlstate.getShape('rect4')).toBeTruthy()
  })
})
