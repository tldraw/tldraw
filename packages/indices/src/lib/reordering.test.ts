describe('Reordering', () => {
	it.todo('Tests reordering')
})

describe('Tests', () => {
	it.todo('Tests reordering')
})

// import { TestScene } from '../../test/TestScene'

// let app: TestScene

// beforeEach(() => {
//   app?.dispose()
//   app = new TestScene({
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
//     expect(app.root.sortedChildren.map((shape) => shape.index)).toMatchObject([
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
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })
// })

// describe('app.getSiblingAbove', () => {
//   it('Gets the correct shape above', () => {
//     expect(app.getSiblingAbove('B')?.id).toBe('C')
//     expect(app.getSiblingAbove('C')?.id).toBe('D')
//     expect(app.getSiblingAbove('G')?.id).toBeUndefined()
//   })
// })

// describe('app.getSiblingAbove', () => {
//   it('Gets the correct shape above', () => {
//     expect(app.getSiblingBelow('A')?.id).toBeUndefined()
//     expect(app.getSiblingBelow('B')?.id).toBe('A')
//     expect(app.getSiblingBelow('C')?.id).toBe('B')
//   })
// })

// describe('When sending to back', () => {
//   it('Moves one shape to back', () => {
//     app.sendToBack(['D'])
//     app.expectShapesInOrder('D', 'A', 'B', 'C')
//     app.sendToBack(['D']) // noop
//     app.expectShapesInOrder('D', 'A', 'B', 'C')
//   })

//   it('Moves no shapes when selecting shapes at the back', () => {
//     app.sendToBack(['A', 'B', 'C'])
//     app.expectShapesInOrder('A', 'B', 'C')
//     app.sendToBack(['A', 'B', 'C'])
//     app.expectShapesInOrder('A', 'B', 'C')
//   })

//   it('Moves two adjacent shapes to back', () => {
//     app.sendToBack(['D', 'E'])
//     app.expectShapesInOrder('D', 'E', 'A', 'B', 'C', 'F', 'G')
//     app.sendToBack(['D', 'E'])
//     app.expectShapesInOrder('D', 'E', 'A', 'B', 'C', 'F', 'G')
//   })

//   it('Moves non-adjacent shapes to back', () => {
//     app.sendToBack(['E', 'G'])
//     app.expectShapesInOrder('E', 'G', 'A', 'B', 'C', 'D', 'F')
//     app.sendToBack(['E', 'G'])
//     app.expectShapesInOrder('E', 'G', 'A', 'B', 'C', 'D', 'F')
//   })

//   it('Moves non-adjacent shapes to back when one is at the back', () => {
//     app.sendToBack(['A', 'G'])
//     app.expectShapesInOrder('A', 'G', 'B', 'C', 'D', 'E', 'F')
//     app.sendToBack(['A', 'G'])
//     app.expectShapesInOrder('A', 'G', 'B', 'C', 'D', 'E', 'F')
//   })
// })

// describe('When sending to front', () => {
//   it('Moves one shape to front', () => {
//     app.bringToFront(['A'])
//     app.expectShapesInOrder('B', 'C', 'D', 'E', 'F', 'G', 'A')
//     app.bringToFront(['A']) // noop
//     app.expectShapesInOrder('B', 'C', 'D', 'E', 'F', 'G', 'A')
//   })

//   it('Moves no shapes when selecting shapes at the front', () => {
//     app.bringToFront(['G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     app.bringToFront(['G']) // noop
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves two adjacent shapes to front', () => {
//     app.bringToFront(['D', 'E'])
//     app.expectShapesInOrder('A', 'B', 'C', 'F', 'G', 'D', 'E')
//     app.bringToFront(['D', 'E']) // noop
//     app.expectShapesInOrder('A', 'B', 'C', 'F', 'G', 'D', 'E')
//   })

//   it('Moves non-adjacent shapes to front', () => {
//     app.bringToFront(['A', 'C'])
//     app.expectShapesInOrder('B', 'D', 'E', 'F', 'G', 'A', 'C')
//     app.bringToFront(['A', 'C']) // noop
//     app.expectShapesInOrder('B', 'D', 'E', 'F', 'G', 'A', 'C')
//   })

//   it('Moves non-adjacent shapes to front when one is at the front', () => {
//     app.bringToFront(['E', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'F', 'E', 'G')
//     app.bringToFront(['E', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'F', 'E', 'G')
//   })
// })

// describe('When sending backward', () => {
//   it('Moves one shape backward', () => {
//     app.sendBackward(['C'])
//     app.expectShapesInOrder('A', 'C', 'B')
//     app.sendBackward(['C'])
//     app.expectShapesInOrder('C', 'A', 'B')
//   })

//   it('Moves shapes to the first position', () => {
//     app.sendBackward(['B'])
//     app.expectShapesInOrder('B', 'A', 'C', 'D', 'E', 'F', 'G')
//     app.sendBackward(['A'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     app.sendBackward(['B'])
//     app.expectShapesInOrder('B', 'A', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves two shapes to the first position', () => {
//     app.sendBackward(['B', 'C'])
//     app.expectShapesInOrder('B', 'C', 'A', 'D', 'E', 'F', 'G')
//     app.sendBackward(['C', 'A'])
//     app.expectShapesInOrder('C', 'A', 'B', 'D', 'E', 'F', 'G')
//     app.sendBackward(['A', 'B'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves no shapes when sending shapes at the back', () => {
//     app.sendBackward(['A', 'B', 'C'])
//     app.expectShapesInOrder('A', 'B', 'C')
//     app.sendBackward(['A', 'B', 'C'])
//     app.expectShapesInOrder('A', 'B', 'C')
//   })

//   it('Moves two adjacent shapes backward', () => {
//     app.sendBackward(['D', 'E'])
//     app.expectShapesInOrder('A', 'B', 'D', 'E', 'C', 'F', 'G')
//   })

//   it('Moves two adjacent shapes backward when one is at the back', () => {
//     app.sendBackward(['A', 'E'])
//     app.expectShapesInOrder('A', 'B', 'C', 'E', 'D', 'F', 'G')
//     app.sendBackward(['A', 'E'])
//     app.expectShapesInOrder('A', 'B', 'E', 'C', 'D', 'F', 'G')
//   })

//   it('Moves non-adjacent shapes backward', () => {
//     app.sendBackward(['E', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'E', 'D', 'G', 'F')
//     app.sendBackward(['E', 'G'])
//     app.expectShapesInOrder('A', 'B', 'E', 'C', 'G', 'D', 'F')
//   })

//   it('Moves non-adjacent shapes backward when one is at the back', () => {
//     app.sendBackward(['A', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'G', 'F')
//     app.sendBackward(['A', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'G', 'E', 'F')
//   })

//   it('Moves non-adjacent shapes to backward when both are at the back', () => {
//     app.sendBackward(['A', 'B'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     app.sendBackward(['A', 'B'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })
// })

// describe('When moving forward', () => {
//   it('Moves one shape forward', () => {
//     app.bringForward(['A'])
//     app.expectShapesInOrder('B', 'A', 'C', 'D', 'E', 'F', 'G')
//     app.bringForward(['A'])
//     app.expectShapesInOrder('B', 'C', 'A', 'D', 'E', 'F', 'G')
//   })

//   it('Moves no shapes when sending shapes at the front', () => {
//     app.bringForward(['E', 'F', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     app.bringForward(['E', 'F', 'G']) // noop
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })

//   it('Moves two adjacent shapes forward', () => {
//     app.bringForward(['C', 'D'])
//     app.expectShapesInOrder('A', 'B', 'E', 'C', 'D', 'F', 'G')
//     app.bringForward(['C', 'D'])
//     app.expectShapesInOrder('A', 'B', 'E', 'F', 'C', 'D', 'G')
//   })

//   it('Moves non-adjacent shapes forward', () => {
//     app.bringForward(['A', 'C'])
//     app.expectShapesInOrder('B', 'A', 'D', 'C', 'E', 'F', 'G')
//     app.bringForward(['A', 'C'])
//     app.expectShapesInOrder('B', 'D', 'A', 'E', 'C', 'F', 'G')
//   })

//   it('Moves non-adjacent shapes to forward when one is at the front', () => {
//     app.bringForward(['C', 'G'])
//     app.expectShapesInOrder('A', 'B', 'D', 'C', 'E', 'F', 'G')
//     app.bringForward(['C', 'G'])
//     app.expectShapesInOrder('A', 'B', 'D', 'E', 'C', 'F', 'G')
//   })

//   it('Moves adjacent shapes to forward when both are at the front', () => {
//     app.bringForward(['F', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//     app.bringForward(['F', 'G'])
//     app.expectShapesInOrder('A', 'B', 'C', 'D', 'E', 'F', 'G')
//   })
// })

// // Edges

// describe('Edge cases...', () => {
//   it('When bringing forward, does not increment order if shapes at at the top', () => {
//     app.bringForward(['F', 'G'])
//   })
//   it('When bringing forward, does not increment order with non-adjacent shapes if shapes at at the top', () => {
//     app.bringForward(['E', 'G'])
//   })

//   it('When bringing to front, does not change order of shapes already at top', () => {
//     app.bringToFront(['E', 'G'])
//   })

//   it('When sending to back, does not change order of shapes already at bottom', () => {
//     app.sendToBack(['A', 'C'])
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
