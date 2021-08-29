import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import { ColorStyle, DashStyle, SizeStyle, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Transform session', () => {
  const tlstate = new TLDrawState()

  it('begins, updates and completes session', () => {
    tlstate.loadDocument(mockDocument)

    expect(tlstate.getShape('draw1')).toBe(undefined)

    tlstate
      .create({
        id: 'draw1',
        parentId: 'page1',
        name: 'Draw',
        childIndex: 5,
        type: TLDrawShapeType.Draw,
        point: [32, 32],
        points: [[0, 0]],
        style: {
          dash: DashStyle.Draw,
          size: SizeStyle.Medium,
          color: ColorStyle.Blue,
        },
      })
      .select('draw1')
      .startDrawSession('draw1', [0, 0])
      .updateDrawSession([10, 10], 0.5)
      .completeSession()

    expect(tlstate.appState.status.current).toBe(TLDrawStatus.Idle)
  })

  it('does, undoes and redoes', () => {
    expect(tlstate.getShape('draw1')).toBeTruthy()

    tlstate.undo()

    expect(tlstate.getShape('draw1')).toBe(undefined)

    tlstate.redo()

    expect(tlstate.getShape('draw1')).toBeTruthy()
  })
})
