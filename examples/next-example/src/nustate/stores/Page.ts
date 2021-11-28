// import { ColorStyle, DashStyle, SizeStyle, TDPage, TDShapeType } from '~types'
// import { observable, action, makeObservable } from 'mobx'
// import { TDRectangleShape } from './shapes'

// export class Page implements TDPage {
//   @observable id
//   @observable name
//   @observable shapes
//   @observable bindings

//   constructor(opts = {} as Partial<TDPage>) {
//     const { id, name, shapes, bindings } = { ...opts, ...Page.defaultProps }
//     this.id = id
//     this.name = name
//     this.shapes = shapes
//     this.bindings = bindings
//     makeObservable(this)
//   }

//   @action update = (change: Partial<TDPage>) => {
//     Object.assign(this, change)
//   }

//   static defaultProps: TDPage = {
//     id: 'page',
//     name: 'page',
//     shapes: {
//       rect1: new TDRectangleShape({
//         id: 'rect1',
//         parentId: 'page',
//         name: 'Rectangle',
//         childIndex: 1,
//         type: TDShapeType.Rectangle,
//         point: [0, 0],
//         size: [100, 100],
//         style: {
//           dash: DashStyle.Draw,
//           size: SizeStyle.Medium,
//           color: ColorStyle.Blue,
//         },
//       }),
//       // rect1: {
//       //   id: 'rect1',
//       //   parentId: 'page',
//       //   name: 'Rectangle',
//       //   childIndex: 1,
//       //   type: TDShapeType.Rectangle,
//       //   point: [0, 0],
//       //   size: [100, 100],
//       //   style: {
//       //     dash: DashStyle.Draw,
//       //     size: SizeStyle.Medium,
//       //     color: ColorStyle.Blue,
//       //   },
//       // },
//     },
//     bindings: {},
//   }
// }
