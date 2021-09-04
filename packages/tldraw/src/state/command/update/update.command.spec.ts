import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { Utils } from '@tldraw/core'

const doc = Utils.deepClone(mockDocument)

describe('Update command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(doc)
    tlstate.updateShapes({ id: 'rect1', point: [100, 100] })
    expect(tlstate.getShape('rect1').point).toStrictEqual([100, 100])
    tlstate.undo()
    expect(tlstate.getShape('rect1').point).toStrictEqual([0, 0])
    tlstate.redo()
    expect(tlstate.getShape('rect1').point).toStrictEqual([100, 100])
  })
})
