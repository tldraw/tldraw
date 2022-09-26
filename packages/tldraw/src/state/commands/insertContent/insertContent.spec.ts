import { Utils } from '@tldraw/core'
import { TLDR } from '~state/TLDR'
import { TldrawTestApp, mockDocument } from '~test'
import { ColorStyle, DashStyle, SessionType, SizeStyle, TDShapeType } from '~types'

let app: TldrawTestApp

beforeEach(() => {
  app = new TldrawTestApp()
  app.loadDocument(mockDocument)
})

describe('insert command', () => {
  it('Inserts shapes, bindings, etc. into the current page', () => {
    const content = app.getContent()!
    const size = app.shapes.length
    app.insertContent(content)
    expect(app.shapes.length).toBe(size * 2)
  })

  it('Selects content when opts.select is true', () => {
    const content = app.getContent()!
    const size = app.shapes.length
    const prevSelectedIds = [...app.selectedIds]
    app.insertContent(content, { select: true })
    expect(app.shapes.length).toBe(size * 2)
    expect(app.selectedIds).not.toMatchObject(prevSelectedIds)
  })

  it('Centers inserted content at a point', () => {
    app.select('rect1')
    const content = app.getContent()!

    const before = [...app.shapes]

    const point = [222, 444]

    app.insertContent(content, { point })

    const inserted = [...app.shapes].filter((s) => !before.includes(s))

    expect(
      Utils.getBoundsCenter(Utils.getCommonBounds(inserted.map(TLDR.getBounds)))
    ).toMatchObject(point)
  })

  it('does nothing when ids are explicitly empty', () => {
    const content = app.getContent([])
    expect(content).toBe(undefined)
  })

  it('uses the selected ids when no ids provided', () => {
    app.select('rect1')
    const content = app.getContent()!
    const size = app.shapes.length
    app.insertContent(content)
    expect(app.shapes.length).toBe(size + 1)
  })

  it('uses all shape ids from the page when no selection, either', () => {
    app.selectNone()
    const content = app.getContent()!
    const size = app.shapes.length
    app.insertContent(content)
    expect(app.shapes.length).toBe(size * 2)
  })

  it('does nothing if the page has no shapes, either', () => {
    app.deleteAll()
    const content = app.getContent()
    expect(content).toBe(undefined)
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

    const content = app.getContent()!
    const size = app.shapes.length

    app.insertContent(content)
    expect(app.bindings.length).toBe(2)
    expect(app.shapes.length).toBe(size * 2)
  })

  it('removes bindings when only one shape is inserted', () => {
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

    expect(app.bindings.length).toBe(1) // arrow1 -> rect3

    app.select('rect3') // select only rect3, not arrow1

    const content = app.getContent()!

    // getContent DOES include the incomplete binding
    expect(Object.values(content.bindings).length).toBe(1)

    app.insertContent(content)

    // insertContent does not paste in the discarded binding
    expect(app.bindings.length).toBe(1)
  })

  it('works with groups', () => {
    app.select('rect1', 'rect2').group().selectAll()

    const content = app.getContent()!

    const size = app.shapes.length

    app.insertContent(content)

    expect(app.shapes.length).toBe(size * 2)
  })

  it('if a shapes parent is not inserted, inserts to the page instead', () => {
    app.select('rect1', 'rect2').group().select('rect1')

    const content = app.getContent()!

    // insertContent discards the incomplete binding
    const size = app.shapes.length

    const before = [...app.shapes]

    app.insertContent(content)

    expect(app.shapes.length).toBe(size + 1)

    const inserted = [...app.shapes].filter((s) => !before.includes(s))[0]

    expect(inserted.parentId).toBe(app.currentPageId)
  })

  it('does not add groups without children', () => {
    // insertContent discards the incomplete binding
    const size = app.shapes.length

    app.insertContent({
      shapes: [
        {
          id: '935ff424-bf40-4e2d-3bfb-d26061150b03',
          type: TDShapeType.Group,
          name: 'Group',
          parentId: 'currentPageId',
          childIndex: 1,
          point: [0, 0],
          size: [100, 100],
          rotation: 0,
          children: [],
          style: {
            color: ColorStyle.Black,
            size: SizeStyle.Small,
            isFilled: false,
            dash: DashStyle.Dashed,
            scale: 1,
          },
        },
      ],
    })

    expect(app.shapes.length).toBe(size)
  })
})

describe('When opts.overwrite is true', () => {
  it('replaces content', () => {
    const content = app.getContent()!
    const size = app.shapes.length
    const ids = app.shapes.map((s) => s.id)
    app.insertContent(content, { overwrite: true })
    expect(app.shapes.length).toBe(size)
    expect(app.shapes.map((s) => s.id)).toMatchObject(ids)
  })

  it('restores content under the same ids', () => {
    const content = app.getContent()!
    const ids = app.shapes.map((s) => s.id)
    app.deleteAll().insertContent(content, { overwrite: true })
    expect(app.shapes.map((s) => s.id)).toMatchObject(ids)
  })
})
