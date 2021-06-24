import Command from './command'
import history from '../history'
import { Data, MoveType, Shape } from 'types'
import {
  forceIntegerChildIndices,
  getChildren,
  getPage,
  getSelectedIds,
  setToArray,
} from 'utils'
import { getShapeUtils } from 'state/shape-utils'

export default function moveCommand(data: Data, type: MoveType): void {
  const { currentPageId } = data

  const page = getPage(data)

  const selectedIds = setToArray(getSelectedIds(data))

  const initialIndices = Object.fromEntries(
    selectedIds.map((id) => [id, page.shapes[id].childIndex])
  )

  history.execute(
    data,
    new Command({
      name: 'change_child_index',
      category: 'canvas',
      manualSelection: true,
      do(data) {
        const page = getPage(data, currentPageId)

        const shapes = selectedIds.map((id) => page.shapes[id])

        const shapesByParentId = shapes.reduce<Record<string, Shape[]>>(
          (acc, shape) => {
            if (acc[shape.parentId] === undefined) {
              acc[shape.parentId] = []
            }
            acc[shape.parentId].push(shape)
            return acc
          },
          {}
        )

        switch (type) {
          case MoveType.ToFront: {
            for (const id in shapesByParentId) {
              moveToFront(shapesByParentId[id], getChildren(data, id))
            }
            break
          }
          case MoveType.ToBack: {
            for (const id in shapesByParentId) {
              moveToBack(shapesByParentId[id], getChildren(data, id))
            }
            break
          }
          case MoveType.Forward: {
            for (const id in shapesByParentId) {
              const visited = new Set<string>()
              const siblings = getChildren(data, id)
              shapesByParentId[id]
                .sort((a, b) => b.childIndex - a.childIndex)
                .forEach((shape) => moveForward(shape, siblings, visited))
            }
            break
          }
          case MoveType.Backward: {
            for (const id in shapesByParentId) {
              const visited = new Set<string>()
              const siblings = getChildren(data, id)
              shapesByParentId[id]
                .sort((a, b) => a.childIndex - b.childIndex)
                .forEach((shape) => moveBackward(shape, siblings, visited))
            }
            break
          }
        }
      },
      undo(data) {
        const page = getPage(data)

        for (const id of selectedIds) {
          const shape = page.shapes[id]
          getShapeUtils(shape).setProperty(
            shape,
            'childIndex',
            initialIndices[id]
          )
        }
      },
    })
  )
}

function moveToFront(shapes: Shape[], siblings: Shape[]) {
  shapes.sort((a, b) => a.childIndex - b.childIndex)

  const diff = siblings
    .filter((sib) => !shapes.includes(sib))
    .sort((a, b) => b.childIndex - a.childIndex)

  if (diff.length === 0) return

  const startIndex = Math.ceil(diff[0].childIndex) + 1

  shapes.forEach((shape, i) =>
    getShapeUtils(shape).setProperty(shape, 'childIndex', startIndex + i)
  )
}

function moveToBack(shapes: Shape[], siblings: Shape[]) {
  shapes.sort((a, b) => b.childIndex - a.childIndex)

  const diff = siblings
    .filter((sib) => !shapes.includes(sib))
    .sort((a, b) => a.childIndex - b.childIndex)

  if (diff.length === 0) return

  const startIndex = diff[0]?.childIndex

  const step = startIndex / (shapes.length + 1)

  shapes.forEach((shape, i) =>
    getShapeUtils(shape).setProperty(
      shape,
      'childIndex',
      startIndex - (i + 1) * step
    )
  )
}

function moveForward(shape: Shape, siblings: Shape[], visited: Set<string>) {
  visited.add(shape.id)
  const index = siblings.indexOf(shape)
  const nextSibling = siblings[index + 1]

  if (nextSibling && !visited.has(nextSibling.id)) {
    const nextNextSibling = siblings[index + 2]

    let nextIndex = nextNextSibling
      ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
      : Math.ceil(nextSibling.childIndex + 1)

    if (nextIndex === nextSibling.childIndex) {
      forceIntegerChildIndices(siblings)

      nextIndex = nextNextSibling
        ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
        : Math.ceil(nextSibling.childIndex + 1)
    }

    getShapeUtils(shape).setProperty(shape, 'childIndex', nextIndex)

    siblings.sort((a, b) => a.childIndex - b.childIndex)
  }
}

function moveBackward(shape: Shape, siblings: Shape[], visited: Set<string>) {
  visited.add(shape.id)
  const index = siblings.indexOf(shape)
  const nextSibling = siblings[index - 1]

  if (nextSibling && !visited.has(nextSibling.id)) {
    const nextNextSibling = siblings[index - 2]

    const nextIndex = nextNextSibling
      ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
      : nextSibling.childIndex / 2

    if (shape.childIndex === nextSibling.childIndex) {
      forceIntegerChildIndices(siblings)

      nextNextSibling
        ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
        : nextSibling.childIndex / 2
    }

    getShapeUtils(shape).setProperty(shape, 'childIndex', nextIndex)

    siblings.sort((a, b) => a.childIndex - b.childIndex)
  }
}
