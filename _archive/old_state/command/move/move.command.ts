import { MoveType } from '@tldraw/core'
import { TLDrawShape } from '../../../shape'
import { Data } from '../../../types'
import { TLD } from '../../tld'
import { Command } from '../command'

export function move(data: Data, type: MoveType) {
  const ids = [...TLD.getSelectedIds(data)]

  const initialIndices = Object.fromEntries(ids.map((id) => [id, data.page.shapes[id].childIndex]))

  const shapesByParentId = ids
    .map((id) => data.page.shapes[id])
    .reduce<Record<string, TLDrawShape[]>>((acc, shape) => {
      if (acc[shape.parentId] === undefined) {
        acc[shape.parentId] = []
      }
      acc[shape.parentId].push(shape)
      return acc
    }, {})

  return new Command({
    name: 'move_shapes',
    category: 'canvas',
    do(data) {
      switch (type) {
        case MoveType.ToBack: {
          for (const id in shapesByParentId) {
            moveToBack(data, shapesByParentId[id], TLD.getChildren(data, id))
          }
          break
        }
        case MoveType.Backward: {
          for (const id in shapesByParentId) {
            const visited = new Set<string>()
            shapesByParentId[id]
              .sort((a, b) => a.childIndex - b.childIndex)
              .forEach((shape) => {
                moveBackward(data, shape, TLD.getChildren(data, id), visited)
              })
          }
          break
        }
        case MoveType.Forward: {
          for (const id in shapesByParentId) {
            const visited = new Set<string>()

            shapesByParentId[id]
              .sort((a, b) => b.childIndex - a.childIndex)
              .forEach((shape) => {
                moveForward(data, shape, TLD.getChildren(data, id), visited)
              })
          }

          break
        }
        case MoveType.ToFront: {
          for (const id in shapesByParentId) {
            moveToFront(data, shapesByParentId[id], TLD.getChildren(data, id))
          }

          break
        }
      }
    },
    undo(data) {
      const { shapes } = data.page

      for (const id of ids) {
        const shape = shapes[id]
        TLD.mutate(data, shape, { childIndex: initialIndices[id] })
      }
    },
  })
}

// TODO: Refactor these so that they return the new childIndex array, rather than mutating the shapes

function moveToFront(data: Data, shapes: TLDrawShape[], siblings: TLDrawShape[]) {
  shapes.sort((a, b) => a.childIndex - b.childIndex)

  const diff = siblings
    .filter((sib) => !shapes.includes(sib))
    .sort((a, b) => b.childIndex - a.childIndex)

  if (diff.length === 0) return

  const startIndex = Math.ceil(diff[0].childIndex) + 1

  shapes.forEach((shape, i) => TLD.mutate(data, shape, { childIndex: startIndex + i }))
}

function moveToBack(data: Data, shapes: TLDrawShape[], siblings: TLDrawShape[]) {
  shapes.sort((a, b) => b.childIndex - a.childIndex)

  const diff = siblings
    .filter((sib) => !shapes.includes(sib))
    .sort((a, b) => a.childIndex - b.childIndex)

  if (diff.length === 0) return

  const startIndex = diff[0]?.childIndex

  const step = startIndex / (shapes.length + 1)

  shapes.forEach((shape, i) => TLD.mutate(data, shape, { childIndex: startIndex - (i + 1) * step }))
}

function moveForward(
  data: Data,
  shape: TLDrawShape,
  siblings: TLDrawShape[],
  visited: Set<string>,
) {
  visited.add(shape.id)
  const index = siblings.indexOf(shape)
  let nextSibling = siblings[index + 1]

  if (nextSibling && !visited.has(nextSibling.id)) {
    let nextNextSibling = siblings[index + 2]

    let nextIndex = nextNextSibling
      ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
      : Math.ceil(nextSibling.childIndex + 1)

    if (nextIndex === nextSibling.childIndex) {
      TLD.forceIntegerChildIndices(data, siblings)

      nextSibling = data.page.shapes[nextSibling.id]
      nextNextSibling = data.page.shapes[nextNextSibling.id]

      nextIndex = nextNextSibling
        ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
        : Math.ceil(nextSibling.childIndex + 1)
    }

    TLD.mutate(data, shape, { childIndex: nextIndex })
  }
}

function moveBackward(
  data: Data,
  shape: TLDrawShape,
  siblings: TLDrawShape[],
  visited: Set<string>,
) {
  visited.add(shape.id)
  const index = siblings.indexOf(shape)
  let nextSibling = siblings[index - 1]

  if (nextSibling && !visited.has(nextSibling.id)) {
    let nextNextSibling = siblings[index - 2]

    let nextIndex = nextNextSibling
      ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
      : nextSibling.childIndex / 2

    if (shape.childIndex === nextSibling.childIndex) {
      TLD.forceIntegerChildIndices(data, siblings)

      nextSibling = data.page.shapes[nextSibling.id]
      nextNextSibling = data.page.shapes[nextNextSibling.id]

      nextIndex = nextNextSibling
        ? (nextSibling.childIndex + nextNextSibling.childIndex) / 2
        : nextSibling.childIndex / 2
    }

    TLD.mutate(data, shape, { childIndex: nextIndex })

    siblings.sort((a, b) => a.childIndex - b.childIndex)
  }
}
