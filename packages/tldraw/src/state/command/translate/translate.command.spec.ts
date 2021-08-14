import { TLDrawState } from '~state'
import { mockDocument } from '~test-utils'

describe('Translate command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.nudge([1, 2])

    expect(tlstate.getShape('rect2').point).toEqual([101, 102])

    tlstate.undo()

    expect(tlstate.getShape('rect2').point).toEqual([100, 100])

    tlstate.redo()

    expect(tlstate.getShape('rect2').point).toEqual([101, 102])
  })

  it('major nudges', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.nudge([1, 2], true)
    expect(tlstate.getShape('rect2').point).toEqual([110, 120])
  })
})
