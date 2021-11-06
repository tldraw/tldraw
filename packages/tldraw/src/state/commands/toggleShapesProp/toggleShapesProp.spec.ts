import type { RectangleShape } from '~types'
import { TLDrawState } from '~state'
import { mockDocument } from '~test'

describe('Toggle command', () => {
  const tlstate = new TLDrawState()

  beforeEach(() => {
    tlstate.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const initialState = tlstate.state
      tlstate.toggleHidden()
      const currentState = tlstate.state

      expect(currentState).toEqual(initialState)
    })
  })

  it('does, undoes and redoes command', () => {
    tlstate.selectAll()

    expect(tlstate.getShape('rect2').isLocked).toBe(undefined)

    tlstate.toggleLocked()

    expect(tlstate.getShape('rect2').isLocked).toBe(true)

    tlstate.undo()

    expect(tlstate.getShape('rect2').isLocked).toBe(undefined)

    tlstate.redo()

    expect(tlstate.getShape('rect2').isLocked).toBe(true)
  })

  it('toggles on before off when mixed values', () => {
    tlstate.select('rect2')

    expect(tlstate.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(undefined)
    expect(tlstate.getShape<RectangleShape>('rect2').isAspectRatioLocked).toBe(undefined)

    tlstate.toggleAspectRatioLocked()

    expect(tlstate.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(undefined)
    expect(tlstate.getShape<RectangleShape>('rect2').isAspectRatioLocked).toBe(true)

    tlstate.selectAll()
    tlstate.toggleAspectRatioLocked()

    expect(tlstate.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(true)
    expect(tlstate.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(true)

    tlstate.toggleAspectRatioLocked()

    expect(tlstate.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(false)
    expect(tlstate.getShape<RectangleShape>('rect1').isAspectRatioLocked).toBe(false)
  })
})

describe('when running the command', () => {
  it('restores selection on undo', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .select('rect1')
      .toggleHidden()
      .deselectAll()
      .undo()

    expect(tlstate.selectedIds).toEqual(['rect1'])

    tlstate.deselectAll().redo()

    expect(tlstate.selectedIds).toEqual(['rect1'])
  })
})
