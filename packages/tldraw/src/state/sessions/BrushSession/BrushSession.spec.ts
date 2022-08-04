import { mockDocument, TldrawTestApp } from '~test'
import { SessionType, TDStatus } from '~types'

describe('Brush session', () => {
  it('begins, updateSession', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .movePointer([-48, -48])
      .startSession(SessionType.Brush)
      .movePointer([10, 10])
      .completeSession()
    expect(app.status).toBe(TDStatus.Idle)
    expect(app.selectedIds.length).toBe(1)
  })

  it('selects multiple shapes', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .movePointer([-10, -10])
      .startSession(SessionType.Brush)
      .movePointer([110, 110])
      .completeSession()
    expect(app.selectedIds.length).toBe(3)
  })

  it('does not de-select original shapes when shift selecting', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .select('rect1')
      .pointCanvas({ x: 300, y: 300, shiftKey: true })
      .startSession(SessionType.Brush)
      .movePointer({ x: 301, y: 301, shiftKey: true })
      .completeSession()
    expect(app.selectedIds.length).toBe(1)
  })

  it('does not select locked shapes', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .toggleLocked(['rect1'])
      .selectNone()
      .pointCanvas({ x: -10, y: -10, shiftKey: true })
      .movePointer([-10, -10])
      .completeSession()
    expect(app.selectedIds.length).toBe(0)
  })

  it('when command is held, require the entire shape to be selected', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectNone()
      .movePointer([-10, -10])
      .startSession(SessionType.Brush)
      .movePointer({ x: 10, y: 10, shiftKey: false, altKey: false, ctrlKey: true })
      .completeSession()

    expect(app.selectedIds.length).toBe(0)
  })

  it('selects groups rather than grouped shapes', () => {
    const app = new TldrawTestApp()
      .loadDocument(mockDocument)
      .selectAll()
      .group()
      .movePointer([-10, -10])
      .startSession(SessionType.Brush)
      .movePointer({ x: 100, y: 100 })
      .stopPointing()

    expect(app.selectedIds.length).toBe(1)
  })
})
