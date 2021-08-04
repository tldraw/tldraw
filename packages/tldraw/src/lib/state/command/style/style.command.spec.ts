import { SizeStyle } from '../../../shape'
import { TLDrawState } from '../../tlstate'
import { mockDocument } from '../../test-helpers'

describe('Style command', () => {
  const tlstate = new TLDrawState()
  tlstate.loadDocument(mockDocument)
  tlstate.reset()
  tlstate.setSelectedIds(['rect1'])

  it('does, undoes and redoes command', () => {
    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    tlstate.style({ size: SizeStyle.Small })

    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Small)

    tlstate.undo()

    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Medium)

    tlstate.redo()

    expect(tlstate.getShape('rect1').style.size).toEqual(SizeStyle.Small)
  })
})
