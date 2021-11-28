// import { RectangleShape, TDMeta, TDShapeType } from '~types'
// import { defaultStyle, getShapeStyle } from '~state/shapes/shared'
// import { TDBaseShape } from './TDBaseShape'
// import { makeObservable, action, computed, observable } from 'mobx'
// import React from 'react'
// import { SVGContainer, TLComponentProps } from '@tldraw/core'

// export class TDRectangleShape extends TDBaseShape<RectangleShape> {
//   @observable id = 'id'
//   @observable type = TDShapeType.Rectangle as const
//   @observable name = 'Rectangle'
//   @observable parentId = 'page'
//   @observable childIndex = 1
//   @observable point = [0, 0]
//   @observable size = [1, 1]
//   @observable rotation = 0
//   @observable style = defaultStyle

//   constructor(opts = {} as Partial<RectangleShape>) {
//     super()
//     Object.assign(this, opts)
//     makeObservable(this)
//   }

//   @action setSize = (size: number[]) => {
//     this.size = size
//   }

//   @computed get bounds() {
//     const [width, height] = this.size

//     return {
//       minX: 0,
//       maxX: width,
//       minY: 0,
//       maxY: height,
//       width,
//       height,
//     }
//   }

//   Component = React.forwardRef(
//     (
//       { shape, events, meta }: TLComponentProps<RectangleShape, SVGSVGElement, TDMeta>,
//       ref: React.ForwardedRef<SVGSVGElement>
//     ) => {
//       const [width, height] = shape.size

//       const styles = getShapeStyle(shape.style, meta.isDarkMode)

//       const { strokeWidth } = styles

//       return (
//         <SVGContainer ref={ref} id={shape.id + '_svg'} {...events}>
//           <rect
//             x={0}
//             y={0}
//             width={width}
//             height={height}
//             fill={styles.fill}
//             strokeWidth={strokeWidth}
//             stroke={styles.stroke}
//             pointerEvents="all"
//           />
//         </SVGContainer>
//       )
//     }
//   )

//   // Indicator = TDShapeUtil.Indicator<T>(({ shape }) => {
//   //   const {
//   //     style,
//   //     size: [width, height],
//   //   } = shape

//   //   const styles = getShapeStyle(style, false)
//   //   const sw = styles.strokeWidth

//   //   if (style.dash === DashStyle.Draw) {
//   //     return <path d={getRectangleIndicatorPathTDSnapshot(shape)} />
//   //   }

//   //   return (
//   //     <rect
//   //       x={sw}
//   //       y={sw}
//   //       rx={1}
//   //       ry={1}
//   //       width={Math.max(1, width - sw * 2)}
//   //       height={Math.max(1, height - sw * 2)}
//   //     />
//   //   )
//   // })

//   // shouldRender = (prev: T, next: T) => {
//   //   return next.size !== prev.size || next.style !== prev.style
//   // }

//   // transform = transformRectangle

//   // transformSingle = transformSingleRectangle
// }
