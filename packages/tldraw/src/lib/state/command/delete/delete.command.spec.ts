import { TLDrawState } from '../../tlstate'
import { mockDocument } from '../../test-helpers'

describe('Delete command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect2')
    tlstate.delete()

    expect(tlstate.getShape('rect2')).toBe(undefined)
    expect(tlstate.getPageState().selectedIds.length).toBe(0)

    tlstate.undo()

    expect(tlstate.getShape('rect2')).toBeTruthy()
    expect(tlstate.getPageState().selectedIds.length).toBe(1)

    tlstate.redo()

    expect(tlstate.getShape('rect2')).toBe(undefined)
    expect(tlstate.getPageState().selectedIds.length).toBe(0)
  })

  it('deletes two shapes', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.delete()

    expect(tlstate.getShape('rect1')).toBe(undefined)
    expect(tlstate.getShape('rect2')).toBe(undefined)

    tlstate.undo()

    expect(tlstate.getShape('rect1')).toBeTruthy()
    expect(tlstate.getShape('rect2')).toBeTruthy()

    tlstate.redo()

    expect(tlstate.getShape('rect1')).toBe(undefined)
    expect(tlstate.getShape('rect2')).toBe(undefined)
  })
})
