import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawStatus } from '~types'

describe('Brush session', () => {
  it('begins, updateSession', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .deselectAll()
      .startSession(SessionType.Brush, [-10, -10])
      .updateSession([10, 10])
      .completeSession()
    expect(tlstate.appState.status.current).toBe(TLDrawStatus.Idle)
    expect(tlstate.selectedIds.length).toBe(1)
  })

  it('selects multiple shapes', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .deselectAll()
      .startSession(SessionType.Brush, [-10, -10])
      .updateSession([110, 110])
      .completeSession()
    expect(tlstate.selectedIds.length).toBe(3)
  })

  it('does not de-select original shapes', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .deselectAll()
      .select('rect1')
      .startSession(SessionType.Brush, [300, 300])
      .updateSession([301, 301])
      .completeSession()
    expect(tlstate.selectedIds.length).toBe(1)
  })

  // it('does not select hidden shapes', () => {
  //   const tlstate = new TLDrawState()
  //     .loadDocument(mockDocument)
  //     .deselectAll()
  //     .toggleHidden(['rect1'])
  //     .deselectAll()
  //     .startSession(SessionType.Brush, [-10, -10])
  //     .updateSession([10, 10])
  //     .completeSession()
  // })

  it('when command is held, require the entire shape to be selected', () => {
    const tlstate = new TLDrawState()
      .loadDocument(mockDocument)
      .deselectAll()
      .loadDocument(mockDocument)
      .deselectAll()
      .startSession(SessionType.Brush, [-10, -10])
      .updateSession([10, 10], false, false, true)
      .completeSession()

    expect(tlstate.selectedIds.length).toBe(0)
  })
})
