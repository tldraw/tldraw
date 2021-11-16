import { mockDocument, TldrawTestApp } from '~test'
import { SessionType, TldrawStatus } from '~types'

describe('Brush session', () => {
  it('begins, updateSession', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .movePointer([-10, -10])
      .startSession(SessionType.Brush)
      .movePointer([10, 10])
      .completeSession()
    expect(state.appState.status).toBe(TldrawStatus.Idle)
    expect(state.selectedIds.length).toBe(1)
  })

  it('selects multiple shapes', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .movePointer([-10, -10])
      .startSession(SessionType.Brush)
      .movePointer([110, 110])
      .completeSession()
    expect(state.selectedIds.length).toBe(3)
  })

  it('does not de-select original shapes when shift selecting', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .select('rect1')
      .pointCanvas({ x: 300, y: 300, shiftKey: true })
      .startSession(SessionType.Brush)
      .movePointer({ x: 301, y: 301, shiftKey: true })
      .completeSession()
    expect(state.selectedIds.length).toBe(1)
  })

  it('does not select locked shapes', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .toggleLocked(['rect1'])
      .selectNone()
      .pointCanvas({ x: -10, y: -10, shiftKey: true })
      .movePointer([-10, -10])
      .completeSession()
    expect(state.selectedIds.length).toBe(0)
  })

  it('when command is held, require the entire shape to be selected', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .loadDocument(mockDocument)
      .selectNone()
      .movePointer([-10, -10])
      .startSession(SessionType.Brush)
      .movePointer({ x: 10, y: 10, shiftKey: false, altKey: false, ctrlKey: true })
      .completeSession()

    expect(state.selectedIds.length).toBe(0)
  })
})
