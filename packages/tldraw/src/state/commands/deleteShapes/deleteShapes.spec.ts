import { mockDocument, TldrawTestApp } from '~test'
import {
  ColorStyle,
  DashStyle,
  SessionType,
  SizeStyle,
  TDAssetType,
  TDDocument,
  TDShapeType,
} from '~types'

describe('Delete command', () => {
  const app = new TldrawTestApp()

  beforeEach(() => {
    app.loadDocument(mockDocument)
  })

  describe('when no shape is selected', () => {
    it('does nothing', () => {
      const app = new TldrawTestApp()
      const initialapp = app.state
      app.delete()
      const currentapp = app.state

      expect(currentapp).toEqual(initialapp)
    })
  })

  it('does, undoes and redoes command', () => {
    app.select('rect2')
    app.delete()

    expect(app.getShape('rect2')).toBe(undefined)
    expect(app.selectedIds.length).toBe(0)

    app.undo()

    expect(app.getShape('rect2')).toBeTruthy()
    expect(app.selectedIds.length).toBe(1)

    app.redo()

    expect(app.getShape('rect2')).toBe(undefined)
    expect(app.selectedIds.length).toBe(0)
  })

  it('deletes two shapes', () => {
    app.selectAll()
    app.delete()

    expect(app.getShape('rect1')).toBe(undefined)
    expect(app.getShape('rect2')).toBe(undefined)

    app.undo()

    expect(app.getShape('rect1')).toBeTruthy()
    expect(app.getShape('rect2')).toBeTruthy()

    app.redo()

    expect(app.getShape('rect1')).toBe(undefined)
    expect(app.getShape('rect2')).toBe(undefined)
  })

  it('deletes bound shapes, undoes and redoes', () => {
    new TldrawTestApp()
      .createShapes(
        { type: TDShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
        { type: TDShapeType.Arrow, id: 'arrow1', point: [200, 200] }
      )
      .select('arrow1')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow1', 'start')
      .movePointer([50, 50])
      .completeSession()
      .delete()
      .undo()
  })

  it('deletes bound shapes', () => {
    expect(Object.values(app.page.bindings)[0]).toBe(undefined)

    app
      .selectNone()
      .createShapes({
        id: 'arrow1',
        type: TDShapeType.Arrow,
      })
      .select('arrow1')
      .movePointer([0, 0])
      .startSession(SessionType.Arrow, 'arrow1', 'start')
      .movePointer([110, 110])
      .completeSession()

    const binding = Object.values(app.page.bindings)[0]

    expect(binding).toBeTruthy()
    expect(binding.fromId).toBe('arrow1')
    expect(binding.toId).toBe('rect3')
    expect(binding.handleId).toBe('start')
    expect(app.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    app.select('rect3').delete()

    expect(Object.values(app.page.bindings)[0]).toBe(undefined)
    expect(app.getShape('arrow1').handles?.start.bindingId).toBe(undefined)

    app.undo()

    expect(Object.values(app.page.bindings)[0]).toBeTruthy()
    expect(app.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    app.redo()

    expect(Object.values(app.page.bindings)[0]).toBe(undefined)
    expect(app.getShape('arrow1').handles?.start.bindingId).toBe(undefined)
  })

  describe('when deleting shapes in a group', () => {
    it('updates the group', () => {
      app.group(['rect1', 'rect2', 'rect3'], 'newGroup').select('rect1').delete()

      expect(app.getShape('rect1')).toBeUndefined()
      expect(app.getShape('newGroup').children).toStrictEqual(['rect2', 'rect3'])
    })
  })

  describe('when deleting a group', () => {
    it('deletes all grouped shapes', () => {
      app.group(['rect1', 'rect2'], 'newGroup').select('newGroup').delete()

      expect(app.getShape('rect1')).toBeUndefined()
      expect(app.getShape('rect2')).toBeUndefined()
      expect(app.getShape('newGroup')).toBeUndefined()

      app.undo()
      expect(app.getShape('rect1')).toBeTruthy()
      expect(app.getShape('rect2')).toBeTruthy()
      expect(app.getShape('newGroup')).toBeTruthy()
    })
  })

  describe('when deleting grouped shapes', () => {
    it('deletes the group too', () => {
      const app = new TldrawTestApp()
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2', 'rect3'], 'newGroup')
        .select('rect1', 'rect2', 'rect3')
        .delete()

      expect(app.getShape('newGroup')).toBeUndefined()

      app.undo()

      expect(app.getShape('newGroup')).toBeTruthy()
    })
  })

  it.todo('Does not delete uneffected bindings.')

  describe('when deleting shapes with assets', () => {
    it('should remove the asset from the asset table', () => {
      const app = new TldrawTestApp().loadDocument(mockDocumentWithImage)

      expect(Object.keys(app.document.assets).length).toBe(1)

      app.select('image1').delete()

      expect(app.getShape('image1')).toBeUndefined()
      expect(Object.keys(app.document.assets).length).toBe(0)

      app.undo()

      expect(app.getShape('image1')).toBeTruthy()
      expect(Object.keys(app.document.assets).length).toBe(1)
    })

    it('should not remove a shared asset from the asset table', () => {
      const app = new TldrawTestApp().loadDocument(mockDocumentWithSharedAssets).delete(['image1'])

      expect(app.getShape('image1')).toBeUndefined()
      expect(app.getShape('image2')).toBeDefined()
      expect(Object.keys(app.document.assets).length).toBe(1)

      app.undo()

      expect(app.getShape('image1')).toBeDefined()
      expect(app.getShape('image2')).toBeDefined()
      expect(Object.keys(app.document.assets).length).toBe(1)
    })
  })
})

const mockDocumentWithImage: TDDocument = {
  version: 16,
  id: 'doc',
  name: 'New Document',
  pages: {
    page1: {
      id: 'page1',
      shapes: {
        image1: {
          id: 'image1',
          parentId: 'page1',
          name: 'Rectangle',
          childIndex: 1,
          type: TDShapeType.Image,
          point: [0, 0],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          assetId: 'asset1',
        },
      },
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
  assets: {
    asset1: {
      type: TDAssetType.Image,
      src: 'https://image.com',
      size: [100, 100],
      id: 'asset1',
    },
  },
}

const mockDocumentWithSharedAssets: TDDocument = {
  version: 16,
  id: 'doc',
  name: 'New Document',
  pages: {
    page1: {
      id: 'page1',
      shapes: {
        image1: {
          id: 'image1',
          parentId: 'page1',
          name: 'Image 1',
          childIndex: 1,
          type: TDShapeType.Image,
          point: [0, 0],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          assetId: '123',
        },
        image2: {
          id: 'image2',
          parentId: 'page1',
          name: 'Image 2',
          childIndex: 2,
          type: TDShapeType.Image,
          point: [100, 100],
          size: [100, 100],
          style: {
            dash: DashStyle.Draw,
            size: SizeStyle.Medium,
            color: ColorStyle.Blue,
          },
          assetId: '123',
        },
      },
      bindings: {},
    },
  },
  pageStates: {
    page1: {
      id: 'page1',
      selectedIds: [],
      camera: {
        point: [0, 0],
        zoom: 1,
      },
    },
  },
  assets: {
    '123': {
      type: TDAssetType.Image,
      src: 'https://image.com',
      size: [100, 100],
      id: '123',
    },
  },
}
