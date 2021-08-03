import { TLDrawState } from '../../../tlstate'
import { mockDocument } from '../../../test-helpers'

describe('Brush session', () => {
  const tlstate = new TLDrawState()
  tlstate.loadDocument(mockDocument)

  it('begins, updates and completes session', () => {
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([10, 10])
    tlstate.completeSession()
    expect(tlstate.getPageState().selectedIds.length).toBe(1)
  })

  it('selects multiple shapes', () => {
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([110, 110])
    tlstate.completeSession()
    expect(tlstate.getPageState().selectedIds.length).toBe(3)
  })

  it('does not de-select original shapes', () => {
    tlstate
      .select('rect1')
      .startBrushSession([300, 300])
      .updateBrushSession([301, 301])
      .completeSession()
    expect(tlstate.getPageState().selectedIds.length).toBe(1)
  })

  it('does not select hidden shapes', () => {
    tlstate.getPageState().selectedIds = []
    tlstate.setState((data) => ({
      page: {
        ...data.page,
        shapes: { ...data.page.shapes, rect1: { ...data.page.shapes['rect1'], isHidden: true } },
      },
    }))
    tlstate.startBrushSession([-10, -10])
    tlstate.updateBrushSession([10, 10])
    tlstate.completeSession()
    expect(tlstate.getPageState().selectedIds.length).toBe(0)
  })
})
