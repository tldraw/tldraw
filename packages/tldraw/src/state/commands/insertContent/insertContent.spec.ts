/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { mockDocument, TldrawTestApp } from '~test'
import { SessionType, TDShapeType } from '~types'

let app: TldrawTestApp

beforeEach(() => {
  app = new TldrawTestApp()
  app.loadDocument(mockDocument)
})

describe('insert command', () => {
  it('Inserts shapes, bindings, etc. into the current page', () => {
    const json = app.getJson()!
    const size = app.shapes.length
    app.insertContent(json)
    expect(app.shapes.length).toBe(size * 2)
  })

  it('does nothing when ids are explicitly empty', () => {
    const json = app.getJson([])
    expect(json).toBe(undefined)
  })

  it('uses the selected ids when no ids provided', () => {
    app.select('rect1')
    const json = app.getJson()!
    const size = app.shapes.length
    app.insertContent(json)
    expect(app.shapes.length).toBe(size + 1)
  })

  it('uses all shape ids from the page when no selection, either', () => {
    app.selectNone()
    const json = app.getJson()!
    const size = app.shapes.length
    app.insertContent(json)
    expect(app.shapes.length).toBe(size * 2)
  })

  it('does nothing if the page has no shapes, either', () => {
    app.deleteAll()
    const json = app.getJson()
    expect(json).toBe(undefined)
  })

  it('includes bindings', () => {
    app
      .createShapes({
        type: TDShapeType.Arrow,
        id: 'arrow1',
        point: [200, 200],
      })
      .select('arrow1')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow1', 'start')
      .movePointer([50, 50])
      .completeSession()
      .selectNone()

    expect(app.bindings.length).toBe(1)

    const json = app.getJson()!
    const size = app.shapes.length

    app.insertContent(json)
    expect(app.bindings.length).toBe(2)
    expect(app.shapes.length).toBe(size * 2)
  })
})
