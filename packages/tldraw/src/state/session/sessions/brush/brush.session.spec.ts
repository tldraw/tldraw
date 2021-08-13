import { TLDrawState } from '~state'
import { mockDocument } from '~state/test-helpers'

describe('Brush session', () => {
  const tlstate = new TLDrawState()
  tlstate.loadDocument(mockDocument)

  it('begins, updates and completes session', () => {
    tlstate.deselectAll()
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([10, 10])
    tlstate.completeSession()
    expect(tlstate.selectedIds.length).toBe(1)
  })

  it('selects multiple shapes', () => {
    tlstate.deselectAll()
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([110, 110])
    tlstate.completeSession()
    expect(tlstate.selectedIds.length).toBe(3)
  })

  it('does not de-select original shapes', () => {
    tlstate.deselectAll()
    tlstate
      .select('rect1')
      .startBrushSession([300, 300])
      .updateBrushSession([301, 301])
      .completeSession()
    expect(tlstate.selectedIds.length).toBe(1)
  })

  it('does not select hidden shapes', () => {
    tlstate.toggleHidden(['rect1'])
    tlstate.deselectAll()
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([10, 10])
    tlstate.completeSession()
    expect(tlstate.selectedIds.length).toBe(0)
  })

  it('when command is held, require the entire shape to be selected', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.deselectAll()
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([10, 10])
    tlstate.completeSession()
  })
})
