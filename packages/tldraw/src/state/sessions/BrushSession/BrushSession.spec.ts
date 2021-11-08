import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { SessionType, TLDrawStatus } from '~types'

describe('Brush session', () => {
  it('begins, updateSession', () => {
    const state = new TLDrawState()
      .loadDocument(mockDocument)
      .selectNone()
      .startSession(SessionType.Brush, [-10, -10])
      .updateSession([10, 10])
      .completeSession()
    expect(state.appState.status).toBe(TLDrawStatus.Idle)
    expect(state.selectedIds.length).toBe(1)
  })

  it('selects multiple shapes', () => {
    const state = new TLDrawState()
      .loadDocument(mockDocument)
      .selectNone()
      .startSession(SessionType.Brush, [-10, -10])
      .updateSession([110, 110])
      .completeSession()
    expect(state.selectedIds.length).toBe(3)
  })

  it('does not de-select original shapes', () => {
    const state = new TLDrawState()
      .loadDocument(mockDocument)
      .selectNone()
      .select('rect1')
      .startSession(SessionType.Brush, [300, 300])
      .updateSession([301, 301])
      .completeSession()
    expect(state.selectedIds.length).toBe(1)
  })

  // it('does not select hidden shapes', () => {
  //   const state = new TLDrawState()
  //     .loadDocument(mockDocument)
  //     .selectNone()
  //     .toggleHidden(['rect1'])
  //     .selectNone()
  //     .startSession(SessionType.Brush, [-10, -10])
  //     .updateSession([10, 10])
  //     .completeSession()
  // })

  it('when command is held, require the entire shape to be selected', () => {
    const state = new TLDrawState()
      .loadDocument(mockDocument)
      .selectNone()
      .loadDocument(mockDocument)
      .selectNone()
      .startSession(SessionType.Brush, [-10, -10])
      .updateSession([10, 10], false, false, true)
      .completeSession()

    expect(state.selectedIds.length).toBe(0)
  })
})
