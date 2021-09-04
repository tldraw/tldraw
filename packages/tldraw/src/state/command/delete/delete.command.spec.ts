import { TLDR } from '~state/tldr'
import { TLDrawState } from '~state'
import { mockDocument } from '~test'
import type { TLDrawShape } from '~types'

describe('Delete command', () => {
  const tlstate = new TLDrawState()

  it('does, undoes and redoes command', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.select('rect2')
    tlstate.delete()

    expect(tlstate.getShape('rect2')).toBe(undefined)
    expect(tlstate.getPageState().selectedIds.length).toBe(0)

    tlstate.undo()

    expect(tlstate.getShape('rect2')).toBeTruthy()
    expect(tlstate.getPageState().selectedIds.length).toBe(1)

    tlstate.redo()

    expect(tlstate.getShape('rect2')).toBe(undefined)
    expect(tlstate.getPageState().selectedIds.length).toBe(0)
  })

  it('deletes two shapes', () => {
    tlstate.loadDocument(mockDocument)
    tlstate.selectAll()
    tlstate.delete()

    expect(tlstate.getShape('rect1')).toBe(undefined)
    expect(tlstate.getShape('rect2')).toBe(undefined)

    tlstate.undo()

    expect(tlstate.getShape('rect1')).toBeTruthy()
    expect(tlstate.getShape('rect2')).toBeTruthy()

    tlstate.redo()

    expect(tlstate.getShape('rect1')).toBe(undefined)
    expect(tlstate.getShape('rect2')).toBe(undefined)
  })

  it('deletes bound shapes', () => {
    tlstate.loadDocument(mockDocument)

    expect(Object.values(tlstate.page.bindings)[0]).toBe(undefined)

    tlstate
      .deselectAll()
      .create(
        TLDR.getShapeUtils({ type: 'arrow' } as TLDrawShape).create({
          id: 'arrow1',
          parentId: 'page1',
        })
      )
      .select('arrow1')
      .startHandleSession([0, 0], 'start')
      .updateHandleSession([110, 110])
      .completeSession()

    const binding = Object.values(tlstate.page.bindings)[0]

    expect(binding).toBeTruthy()
    expect(binding.fromId).toBe('arrow1')
    expect(binding.toId).toBe('rect3')
    expect(binding.handleId).toBe('start')
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    tlstate.select('rect3').delete()

    expect(Object.values(tlstate.page.bindings)[0]).toBe(undefined)
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(undefined)

    tlstate.undo()

    expect(Object.values(tlstate.page.bindings)[0]).toBeTruthy()
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(binding.id)

    tlstate.redo()

    expect(Object.values(tlstate.page.bindings)[0]).toBe(undefined)
    expect(tlstate.getShape('arrow1').handles?.start.bindingId).toBe(undefined)
  })

  describe('when deleting grouped shapes', () => {
    it('updates the group', () => {
      tlstate
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2', 'rect3'], 'newGroup')
        .select('rect1')
        .delete()

      expect(tlstate.getShape('rect1')).toBeUndefined()
      expect(tlstate.getShape('newGroup').children).toStrictEqual(['rect2', 'rect3'])
    })
  })

  describe('when deleting shapes with children', () => {
    it('also deletes the children', () => {
      tlstate
        .loadDocument(mockDocument)
        .group(['rect1', 'rect2'], 'newGroup')
        .select('newGroup')
        .delete()

      expect(tlstate.getShape('rect1')).toBeUndefined()
      expect(tlstate.getShape('rect2')).toBeUndefined()
      expect(tlstate.getShape('newGroup')).toBeUndefined()
    })
  })

  it.todo('Does not delete uneffected bindings.')
})
