// import { EllipseShape, TDShapeType } from '~types'
// import { defaultStyle } from '~state/shapes/shared'
// import { observable, makeObservable } from 'mobx'
// import { TDBaseShape } from './TDBaseShape'

// export class TDEllipseShape extends TDBaseShape<EllipseShape> {
//   @observable id = 'id'
//   @observable type = TDShapeType.Rectangle as const
//   @observable name = 'Rectangle'
//   @observable parentId = 'page'
//   @observable childIndex = 1
//   @observable point = [0, 0]
//   @observable size = [1, 1]
//   @observable rotation = 0
//   @observable style = defaultStyle

//   constructor(opts = {} as Partial<EllipseShape>) {
//     super()
//     Object.assign(this, opts)
//     makeObservable(this)
//   }
// }
