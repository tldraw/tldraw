import state from 'state'
import inputs from 'state/inputs'
import { ShapeType } from 'types'
import { getShape } from 'utils'
import {
  idsAreSelected,
  point,
  rectangleId,
  arrowId,
  getOnlySelectedShape,
  assertShapeProps,
} from './test-utils'
import * as json from './__mocks__/document.json'

describe('deleting single shapes', () => {
  state.reset()
  state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })

  it('deletes a shape and undoes the delete', () => {
    state
      .send('CANCELED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))

    expect(idsAreSelected(state.data, [rectangleId])).toBe(true)

    state.send('DELETED')

    expect(idsAreSelected(state.data, [])).toBe(true)
    expect(getShape(state.data, rectangleId)).toBe(undefined)

    state.send('UNDO')

    expect(getShape(state.data, rectangleId)).toBeTruthy()
    expect(idsAreSelected(state.data, [rectangleId])).toBe(true)

    state.send('REDO')

    expect(getShape(state.data, rectangleId)).toBe(undefined)

    state.send('UNDO')
  })
})

describe('deletes and restores grouped shapes', () => {
  state.reset()
  state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })

  it('creates a group', () => {
    state
      .send('CANCELED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ shiftKey: true }), arrowId)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(point({ shiftKey: true }), arrowId)
      )

    expect(idsAreSelected(state.data, [rectangleId, arrowId])).toBe(true)

    state.send('GROUPED')

    const group = getOnlySelectedShape(state.data)

    // Should select the group
    expect(assertShapeProps(group, { type: ShapeType.Group }))

    const arrow = tld.getShape(state.data, arrowId)

    // The arrow should be have the group as its parent
    expect(assertShapeProps(arrow, { parentId: group.id }))
  })

  // it('selects the new group', () => {
  //   expect(idsAreSelected(state.data, [groupId])).toBe(true)
  // })

  // it('assigns a new parent', () => {
  //   expect(groupId === state.data.currentPageId).toBe(false)
  // })

  // // Rectangle has the same new parent?
  // it('assigns new parent to all selected shapes', () => {
  //   expect(hasParent(state.data, arrowId, groupId)).toBe(true)
  // })

  // // New parent is selected?
  // it('selects the new parent', () => {
  //   expect(idsAreSelected(state.data, [groupId])).toBe(true)
  // })
})

//   // it('selects the group when pointing a shape', () => {
//   //   state
//   //     .send('CANCELED')
//   //     .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
//   //     .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))

//   //   expect(idsAreSelected(state.data, [groupId])).toBe(true)
//   // })

//   // it('keeps selection when pointing bounds', () => {
//   //   state
//   //     .send('CANCELED')
//   //     .send('POINTED_BOUNDS', inputs.pointerDown(point(), 'bounds'))
//   //     .send('STOPPED_POINTING', inputs.pointerUp(point(), 'bounds'))

//   //   expect(idsAreSelected(state.data, [groupId])).toBe(true)
//   // })

//   // it('selects a grouped shape by double-pointing', () => {
//   //   state
//   //     .send('CANCELED')
//   //     .send('DOUBLE_POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
//   //     .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))

//   //   expect(idsAreSelected(state.data, [rectangleId])).toBe(true)
//   // })

//   // it('selects a sibling on point when selecting a grouped shape', () => {
//   //   state
//   //     .send('POINTED_SHAPE', inputs.pointerDown(point(), arrowId))
//   //     .send('STOPPED_POINTING', inputs.pointerUp(point(), arrowId))

//   //   expect(idsAreSelected(state.data, [arrowId])).toBe(true)
//   // })

//   // it('rises up a selection level when escape is pressed', () => {
//   //   state
//   //     .send('CANCELED')
//   //     .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
//   //     .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))

//   //   expect(idsAreSelected(state.data, [groupId])).toBe(true)
//   // })

//   // it('deletes and restores one shape', () => {
//   //   // Delete the rectangle first
//   //   state.send('UNDO')

//   //   expect(getShape(state.data, rectangleId)).toBeTruthy()
//   //   expect(idsAreSelected(state.data, [rectangleId])).toBe(true)

//   //   state.send('REDO')

//   //   expect(getShape(state.data, rectangleId)).toBe(undefined)

//   //   state.send('UNDO')

//   //   expect(getShape(state.data, rectangleId)).toBeTruthy()
//   //   expect(idsAreSelected(state.data, [rectangleId])).toBe(true)
//   // })
// })
