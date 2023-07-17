describe('Reordering', () => {
	it.todo('Tests reordering')
})

describe('Tests', () => {
	it.todo('Tests reordering')
})

// import { TestScene } from '../../test/TestScene'

// let app: TestScene

// beforeEach(() => {
//   editor?.dispose()
//   editor =new TestScene({
//     nodes: [
//       {
//         id: 'A',
//         type: 'geo',
//       },
//       {
//         id: 'B',
//         type: 'geo',
//       },
//       {
//         id: 'C',
//         type: 'geo',
//       },
//       {
//         id: 'D',
//         type: 'geo',
//       },
//       {
//         id: 'E',
//         type: 'geo',
//       },
//       {
//         id: 'F',
//         type: 'geo',
//       },
//       {
//         id: 'G',
//         type: 'geo',
//       },
//     ],
//   })
// })

// describe('When running zindex tests', () => {
//   it('Correctly initializes indices', () => {
//     expect(editor.root.sortedChildren.map((shape) => shape.index)).toMatchObject([
//       'a1',
//       'a2',
//       'a3',
//       'a4',
//       'a5',
//       'a6',
//       'a7',
//     ])
//   })

//   it('Correctly identifies shape orders', () => {
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })
// })

// describe('editor.getSiblingAbove', () => {
//   it('Gets the correct shape above', () => {
//     expect(editor.getSiblingAbove('B')?.id).toBe('C')
//     expect(editor.getSiblingAbove('C')?.id).toBe('D')
//     expect(editor.getSiblingAbove('G')?.id).toBeUndefined()
//   })
// })

// describe('editor.getSiblingAbove', () => {
//   it('Gets the correct shape above', () => {
//     expect(editor.getSiblingBelow('A')?.id).toBeUndefined()
//     expect(editor.getSiblingBelow('B')?.id).toBe('A')
//     expect(editor.getSiblingBelow('C')?.id).toBe('B')
//   })
// })

// describe('When sending to back', () => {
//   it('Moves one shape to back', () => {
//     editor.sendToBack(['D'])
//     editor.expectShapesInOrder('D', 'A', 'B', 'C')
//     editor.sendToBack(['D']) // noop
//     editor.expectShapesInOrder('D', 'A', 'B', 'C')
//   })

//   it('Moves no shapes when selecting shapes at the back', () => {
//     editor.sendToBack(['A', 'B', 'C'])
//     editor.expectShapesInOrder('A', 'B', 'C')
//     editor.sendToBack(['A', 'B', 'C'])
//     editor.expectShapesInOrder('A', 'B', 'C')
//   })

//   it('Moves two adjacent shapes to back', () => {
//     editor.sendToBack(['D', 'E'])
//     editor.expectShapesInOrder('D', 'E', 'A', 'B', 'C', 'F', 'G')
//     editor.sendToBack(['D', 'E'])
//     editor.expectShapesInOrder('D', 'E', 'A', 'B', 'C', 'F', 'G')
//   })

//   it('Moves non-adjacent shapes to back', () => {
//     editor.sendToBack(['E', 'G'])
//     editor.expectShapesInOrder('E', 'G', 'A', 'B', 'C', 'D', 'F')
//     editor.sendToBack(['E', 'G'])
//     editor.expectShapesInOrder('E', 'G', 'A', 'B', 'C', 'D', 'F')
//   })

//   it('Moves non-adjacent shapes to back when one is at the back', () => {
//     editor.sendToBack(['A', 'G'])
//     editor.expectShapesInOrder('A', 'G', 'B', 'C', 'D', 'E', 'F')
//     editor.sendToBack(['A', 'G'])
//     editor.expectShapesInOrder('A', 'G', 'B', 'C', 'D', 'E', 'F')
//   })
// })

// describe('When sending to front', () => {
//   it('Moves one shape to front', () => {
//     editor.bringToFront(['A'])
//     editor.expectShapesInOrder('B', 'C', 'D', 'E', 'F', 'G', 'A')
//     editor.bringToFront(['A']) // noop
//     editor.expectShapesInOrder('B', 'C', 'D', 'E', 'F', 'G', 'A')
//   })

//   it('Moves no shapes when selecting shapes at the front', () => {
//     editor.bringToFront(['G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     editor.bringToFront(['G']) // noop
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves two adjacent shapes to front', () => {
//     editor.bringToFront(['D', 'E'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'F', 'G', 'D', 'E')
//     editor.bringToFront(['D', 'E']) // noop
//     editor.expectShapesInOrder('A', 'B', 'C', 'F', 'G', 'D', 'E')
//   })

//   it('Moves non-adjacent shapes to front', () => {
//     editor.bringToFront(['A', 'C'])
//     editor.expectShapesInOrder('B', 'D', 'E', 'F', 'G', 'A', 'C')
//     editor.bringToFront(['A', 'C']) // noop
//     editor.expectShapesInOrder('B', 'D', 'E', 'F', 'G', 'A', 'C')
//   })

//   it('Moves non-adjacent shapes to front when one is at the front', () => {
//     editor.bringToFront(['E', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'F', 'E', 'G')
//     editor.bringToFront(['E', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'F', 'E', 'G')
//   })
// })

// describe('When sending backward', () => {
//   it('Moves one shape backward', () => {
//     editor.sendBackward(['C'])
//     editor.expectShapesInOrder('A', 'C', 'B')
//     editor.sendBackward(['C'])
//     editor.expectShapesInOrder('C', 'A', 'B')
//   })

//   it('Moves shapes to the first position', () => {
//     editor.sendBackward(['B'])
//     editor.expectShapesInOrder('B', 'A', 'C', 'D', 'E', 'F', 'G')
//     editor.sendBackward(['A'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     editor.sendBackward(['B'])
//     editor.expectShapesInOrder('B', 'A', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves two shapes to the first position', () => {
//     editor.sendBackward(['B', 'C'])
//     editor.expectShapesInOrder('B', 'C', 'A', 'D', 'E', 'F', 'G')
//     editor.sendBackward(['C', 'A'])
//     editor.expectShapesInOrder('C', 'A', 'B', 'D', 'E', 'F', 'G')
//     editor.sendBackward(['A', 'B'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves no shapes when sending shapes at the back', () => {
//     editor.sendBackward(['A', 'B', 'C'])
//     editor.expectShapesInOrder('A', 'B', 'C')
//     editor.sendBackward(['A', 'B', 'C'])
//     editor.expectShapesInOrder('A', 'B', 'C')
//   })

//   it('Moves two adjacent shapes backward', () => {
//     editor.sendBackward(['D', 'E'])
//     editor.expectShapesInOrder('A', 'B', 'D', 'E', 'C', 'F', 'G')
//   })

//   it('Moves two adjacent shapes backward when one is at the back', () => {
//     editor.sendBackward(['A', 'E'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'E', 'D', 'F', 'G')
//     editor.sendBackward(['A', 'E'])
//     editor.expectShapesInOrder('A', 'B', 'E', 'C', 'D', 'F', 'G')
//   })

//   it('Moves non-adjacent shapes backward', () => {
//     editor.sendBackward(['E', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'E', 'D', 'G', 'F')
//     editor.sendBackward(['E', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'E', 'C', 'G', 'D', 'F')
//   })

//   it('Moves non-adjacent shapes backward when one is at the back', () => {
//     editor.sendBackward(['A', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'G', 'F')
//     editor.sendBackward(['A', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'G', 'E', 'F')
//   })

//   it('Moves non-adjacent shapes to backward when both are at the back', () => {
//     editor.sendBackward(['A', 'B'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     editor.sendBackward(['A', 'B'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })
// })

// describe('When moving forward', () => {
//   it('Moves one shape forward', () => {
//     editor.bringForward(['A'])
//     editor.expectShapesInOrder('B', 'A', 'C', 'D', 'E', 'F', 'G')
//     editor.bringForward(['A'])
//     editor.expectShapesInOrder('B', 'C', 'A', 'D', 'E', 'F', 'G')
//   })

//   it('Moves no shapes when sending shapes at the front', () => {
//     editor.bringForward(['E', 'F', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     editor.bringForward(['E', 'F', 'G']) // noop
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves two adjacent shapes forward', () => {
//     editor.bringForward(['C', 'D'])
//     editor.expectShapesInOrder('A', 'B', 'E', 'C', 'D', 'F', 'G')
//     editor.bringForward(['C', 'D'])
//     editor.expectShapesInOrder('A', 'B', 'E', 'F', 'C', 'D', 'G')
//   })

//   it('Moves non-adjacent shapes forward', () => {
//     editor.bringForward(['A', 'C'])
//     editor.expectShapesInOrder('B', 'A', 'D', 'C', 'E', 'F', 'G')
//     editor.bringForward(['A', 'C'])
//     editor.expectShapesInOrder('B', 'D', 'A', 'E', 'C', 'F', 'G')
//   })

//   it('Moves non-adjacent shapes to forward when one is at the front', () => {
//     editor.bringForward(['C', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'D', 'C', 'E', 'F', 'G')
//     editor.bringForward(['C', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'D', 'E', 'C', 'F', 'G')
//   })

//   it('Moves adjacent shapes to forward when both are at the front', () => {
//     editor.bringForward(['F', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     editor.bringForward(['F', 'G'])
//     editor.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })
// })

// // Edges

// describe('Edge cases...', () => {
//   it('When bringing forward, does not increment order if shapes at at the top', () => {
//     editor.bringForward(['F', 'G'])
//   })
//   it('When bringing forward, does not increment order with non-adjacent shapes if shapes at at the top', () => {
//     editor.bringForward(['E', 'G'])
//   })

//   it('When bringing to front, does not change order of shapes already at top', () => {
//     editor.bringToFront(['E', 'G'])
//   })

//   it('When sending to back, does not change order of shapes already at bottom', () => {
//     editor.sendToBack(['A', 'C'])
//   })

//   it('When moving back to front...', () => {
//     app
//       .sendBackward(['F', 'G'])
//       .expectShapesInOrder('A', 'B', 'C', 'D', 'F', 'G', 'E')
//       .sendBackward(['F', 'G'])
//       .expectShapesInOrder('A', 'B', 'C', 'F', 'G', 'D', 'E')
//       .sendBackward(['F', 'G'])
//       .expectShapesInOrder('A', 'B', 'F', 'G', 'C', 'D', 'E')
//       .sendBackward(['F', 'G'])
//       .expectShapesInOrder('A', 'F', 'G', 'B', 'C', 'D', 'E')
//       .sendBackward(['F', 'G'])
//       .expectShapesInOrder('F', 'G', 'A', 'B', 'C', 'D', 'E')
//       .bringForward(['F', 'G'])
//       .bringForward(['F', 'G'])
//       .bringForward(['F', 'G'])
//       .bringForward(['F', 'G'])
//       .bringForward(['F', 'G'])
//       .expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })
// })

// describe('When undoing and redoing...', () => {
//   it('Undoes and redoes', () => {
//     app
//       .expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//       .sendBackward(['F', 'G'])
//       .expectShapesInOrder('A', 'B', 'C', 'D', 'F', 'G', 'E')
//       .undo()
//       .expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     // .redo()
//     // .expectShapesInOrder('A', 'B', 'C', 'D', 'F', 'G', 'E')
//   })
// })

// describe('When shapes are parented...', () => {
//   it('Sorted correctly by pageIndex', () => {
//     app
//       .appendChild('A', 'C')
//       .appendChild('D', 'B')
//       .expectShapesInPageOrder('A', 'C', 'D', 'B', 'E', 'F', 'G')
//   })
// })
