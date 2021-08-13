import { MoveType, Data, TLDrawShape, Command } from '~types'
import { TLDR } from '~state/tldr'

export function move(data: Data, ids: string[], type: MoveType): Command {
  // Get the unique parent ids for the selected elements
  const parentIds = new Set(ids.map((id) => data.page.shapes[id].parentId))

  let result: {
    before: Record<string, Partial<TLDrawShape>>
    after: Record<string, Partial<TLDrawShape>>
  } = { before: {}, after: {} }
  let startIndex: number
  let startChildIndex: number
  let step: number

  // Collect shapes with common parents into a table under their parent id
  Array.from(parentIds.values()).forEach((parentId) => {
    let sortedChildren: TLDrawShape[] = []
    if (parentId === data.page.id) {
      sortedChildren = Object.values(data.page.shapes).sort((a, b) => a.childIndex - b.childIndex)
    } else {
      const parent = data.page.shapes[parentId]
      if (!parent.children) throw Error('No children in parent!')

      sortedChildren = parent.children
        .map((childId) => data.page.shapes[childId])
        .sort((a, b) => a.childIndex - b.childIndex)
    }

    const sortedChildIds = sortedChildren.map((shape) => shape.id)

    const sortedIndicesToMove = ids
      .filter((id) => sortedChildIds.includes(id))
      .map((id) => sortedChildIds.indexOf(id))
      .sort((a, b) => a - b)

    if (sortedIndicesToMove.length === sortedChildIds.length) return

    switch (type) {
      case MoveType.ToBack: {
        //               a       b  c
        // Initial   1   2    3  4  5  6  7
        // Final   .25  .5  .75  1  3  6  7
        //           a   b    c

        // Find the lowest "open" index
        for (let i = 0; i < sortedChildIds.length; i++) {
          if (sortedIndicesToMove.includes(i)) continue
          startIndex = i
          break
        }

        // Find the lowest child index that isn't in sortedIndicesToMove
        startChildIndex = sortedChildren[startIndex].childIndex

        // Find the step for each additional child
        step = startChildIndex / (sortedIndicesToMove.length + 1)

        // Get the results of moving the selected shapes below the first open index's shape
        result = TLDR.mutateShapes(
          data,
          sortedIndicesToMove.map((i) => sortedChildren[i].id).reverse(),
          (_shape, i) => ({
            childIndex: startChildIndex - (i + 1) * step,
          })
        )

        break
      }
      case MoveType.ToFront: {
        //              a     b  c
        // Initial   1  2  3  4  5  6   7
        // Final     1  3  6  7  8  9  10
        //                       a  b   c

        // Find the highest "open" index
        for (let i = sortedChildIds.length - 1; i >= 0; i--) {
          if (sortedIndicesToMove.includes(i)) continue
          startIndex = i
          break
        }

        // Find the lowest child index that isn't in sortedIndicesToMove
        startChildIndex = sortedChildren[startIndex].childIndex

        // Find the step for each additional child
        step = 1

        // Get the results of moving the selected shapes below the first open index's shape
        result = TLDR.mutateShapes(
          data,
          sortedIndicesToMove.map((i) => sortedChildren[i].id),
          (_shape, i) => ({
            childIndex: startChildIndex + (i + 1),
          })
        )

        break
      }
      case MoveType.Backward: {
        //               a           b  c
        // Initial    1  2     3     4  5  6  7
        // Final     .5  1  1.66  2.33  3  6  7
        //           a         b     c

        const indexMap: Record<string, number> = {}

        // Starting from the top...
        for (let i = sortedChildIds.length - 1; i >= 0; i--) {
          // If we found a moving index...
          if (sortedIndicesToMove.includes(i)) {
            for (let j = i; j >= 0; j--) {
              // iterate downward until we find an open spot
              if (!sortedIndicesToMove.includes(j)) {
                // i = the index of the first closed spot
                // j = the index of the first open spot

                startChildIndex =
                  j === 0 ? sortedChildren[j].childIndex / 2 : sortedChildren[j - 1].childIndex

                const step = (sortedChildren[j].childIndex - startChildIndex) / (i - j + 1)

                for (let k = 0; k < i - j; k++) {
                  indexMap[sortedChildren[j + k + 1].id] = startChildIndex + step * (k + 1)
                }

                break
              }
            }
          }
        }

        if (Object.values(indexMap).length > 0) {
          // Get the results of moving the selected shapes below the first open index's shape
          result = TLDR.mutateShapes(
            data,
            sortedIndicesToMove.map((i) => sortedChildren[i].id),
            (shape) => ({
              childIndex: indexMap[shape.id],
            })
          )
        }

        break
      }
      case MoveType.Forward: {
        //             a     b c
        // Initial   1 2   3 4 5 6 7
        // Final     1 3 3.5 6 7 8 9
        //                 a     b c

        const indexMap: Record<string, number> = {}

        // Starting from the top...
        for (let i = 0; i < sortedChildIds.length; i++) {
          // If we found a moving index...
          if (sortedIndicesToMove.includes(i)) {
            // Search for the first open spot above this one
            for (let j = i; j < sortedChildIds.length; j++) {
              if (!sortedIndicesToMove.includes(j)) {
                // i = the low index of the first closed spot
                // j = the high index of the first open spot

                startChildIndex = sortedChildren[j].childIndex

                const step =
                  j === sortedChildIds.length - 1
                    ? 1
                    : (sortedChildren[j + 1].childIndex - startChildIndex) / (j - i + 1)

                for (let k = 0; k < j - i; k++) {
                  indexMap[sortedChildren[i + k].id] = startChildIndex + step * (k + 1)
                }

                break
              }
            }
          }
        }

        if (Object.values(indexMap).length > 0) {
          // Get the results of moving the selected shapes below the first open index's shape
          result = TLDR.mutateShapes(
            data,
            sortedIndicesToMove.map((i) => sortedChildren[i].id),
            (shape) => ({
              childIndex: indexMap[shape.id],
            })
          )
        }

        break
      }
    }
  })

  return {
    id: 'move_shapes',
    before: {
      page: {
        ...data.page,
        shapes: result?.before || {},
      },
    },
    after: {
      page: {
        ...data.page,
        shapes: result?.after || {},
      },
    },
  }
}
