import { mockDocument, TldrawTestApp } from '~test'
import { SessionType, TldrawShapeType, TldrawStatus } from '~types'

describe('Handle session', () => {
  it('begins, updateSession', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'arrow1',
        type: TldrawShapeType.Arrow,
      })
      .select('arrow1')
      .movePointer([-10, -10])
      .startSession(SessionType.Arrow, 'arrow1', 'end')
      .movePointer([10, 10])
      .completeSession()

    expect(state.appState.status).toBe(TldrawStatus.Idle)

    state.undo().redo()
  })

  it('cancels session', () => {
    const state = new TldrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        type: TldrawShapeType.Arrow,
        id: 'arrow1',
      })
      .select('arrow1')
      .movePointer([-10, -10])
      .startSession(SessionType.Arrow, 'arrow1', 'end')
      .movePointer([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
