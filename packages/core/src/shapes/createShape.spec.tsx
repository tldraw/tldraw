// /* eslint-disable @typescript-eslint/no-explicit-any */
// import * as React from 'react'

// /* eslint-disable @typescript-eslint/no-unused-vars */
// import type { TLShape, TLBounds } from '+types'
// import { ShapeUtil } from './createShape'
// import { render } from '@testing-library/react'
// import { SVGContainer } from '+components'
// import Utils from '+utils'

// export interface BoxShape extends TLShape {
//   size: number[]
// }

// export const Box = new ShapeUtil<BoxShape, SVGSVGElement, null, { age: number }>(() => {
//   return {
//     age: 100,
//     type: 'box',
//     defaultProps: {
//       id: 'example1',
//       type: 'box',
//       parentId: 'page',
//       childIndex: 0,
//       name: 'Example Shape',
//       point: [0, 0],
//       size: [100, 100],
//       rotation: 0,
//     },
//     Component({ shape, events, meta }, ref) {
//       return (
//         <SVGContainer ref={ref}>
//           <g {...events}>
//             <rect width={shape.size[0]} height={shape.size[1]} fill="none" stroke="black" />
//           </g>
//         </SVGContainer>
//       )
//     },
//     Indicator({ shape }) {
//       return (
//         <SVGContainer>
//           <rect width={shape.size[0]} height={shape.size[1]} fill="none" stroke="black" />
//         </SVGContainer>
//       )
//     },
//     getBounds(shape) {
//       const bounds = Utils.getFromCache(this.boundsCache, shape, () => {
//         const [width, height] = shape.size
//         return {
//           minX: 0,
//           maxX: width,
//           minY: 0,
//           maxY: height,
//           width,
//           height,
//         } as TLBounds
//       })

//       return Utils.translateBounds(bounds, shape.point)
//     },
//     getRotatedBounds(shape) {
//       return {
//         minX: 0,
//         minY: 0,
//         maxX: 100,
//         maxY: 100,
//         width: 100,
//         height: 100,
//       }
//     },
//     shouldRender(prev, next) {
//       return prev.point !== next.point
//     },
//   }
// })

// const boxShape = {
//   id: 'example1',
//   type: 'box',
//   parentId: 'page',
//   childIndex: 0,
//   name: 'Example Shape',
//   point: [0, 0],
//   size: [100, 100],
//   rotation: 0,
// }

// const box = Box.create({ id: 'box1' })

// describe('shape utils', () => {
//   it('creates a shape utils', () => {
//     expect(Box).toBeTruthy()
//   })

//   it('creates a shape utils with extended properties', () => {
//     expect(Box.age).toBe(100)
//   })

//   it('creates a shape', () => {
//     expect(Box.create({ id: 'box1' })).toStrictEqual({
//       ...boxShape,
//       id: 'box1',
//     })
//   })

//   it('sets config', () => {
//     const bounds = Box.getRotatedBounds(box)
//     expect(bounds).toStrictEqual({
//       minX: 0,
//       minY: 0,
//       maxX: 100,
//       maxY: 100,
//       width: 100,
//       height: 100,
//     })
//   })

//   test('accesses this in an override method', () => {
//     expect(Box.shouldRender(box, { ...box, point: [1, 1] })).toBeTruthy()
//   })

//   test('mounts component without crashing', () => {
//     const box = Box.create({ id: 'box1' })
//     const ref = React.createRef<SVGSVGElement>()

//     const ref2 = React.createRef<HTMLDivElement>()

//     const H = React.forwardRef<HTMLDivElement, { message: string }>((props, ref) => {
//       return <div ref={ref2}>{props.message}</div>
//     })

//     render(<H message="Hello" />)

//     render(
//       <Box._Component
//         ref={ref}
//         shape={box}
//         isEditing={false}
//         isBinding={false}
//         isHovered={false}
//         isSelected={false}
//         isCurrentParent={false}
//         meta={{} as any}
//         events={{} as any}
//       />
//     )
//   })
// })

export {}
