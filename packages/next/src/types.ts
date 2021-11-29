export enum TLNuBoundsEdge {
  Top = 'top_edge',
  Right = 'right_edge',
  Bottom = 'bottom_edge',
  Left = 'left_edge',
}

export enum TLNuBoundsCorner {
  TopLeft = 'top_left_corner',
  TopRight = 'top_right_corner',
  BottomRight = 'bottom_right_corner',
  BottomLeft = 'bottom_left_corner',
}

export type TLNuBoundsHandle =
  | TLNuBoundsCorner
  | TLNuBoundsEdge
  | 'rotate'
  | 'center'
  | 'left'
  | 'right'

export interface TLNuBoundsWithCenter extends TLNuBounds {
  midX: number
  midY: number
}

export enum TLNuSnapPoints {
  minX = 'minX',
  midX = 'midX',
  maxX = 'maxX',
  minY = 'minY',
  midY = 'midY',
  maxY = 'maxY',
}

export type TLNuSnap =
  | { id: TLNuSnapPoints; isSnapped: false }
  | {
      id: TLNuSnapPoints
      isSnapped: true
      to: number
      B: TLNuBoundsWithCenter
      distance: number
    }

export interface TLNuTheme {
  accent?: string
  brushFill?: string
  brushStroke?: string
  selectFill?: string
  selectStroke?: string
  background?: string
  foreground?: string
  grid?: string
}

// export class TLNuHandle {
//   @observable id: string
//   @observable index: number
//   @observable point: number[]
//   @observable meta?: any

//   constructor(id: string, index: number, point = [0, 0], meta?: any) {
//     this.id = id
//     this.index = index
//     this.point = point
//     this.meta = meta
//     makeObservable(this)
//   }
// }

// export class TLNuBounds {
//   @observable point: number[]
//   @observable size: number[]
//   @observable rotation?: number = 0

//   constructor(point: number[], size: number[], rotation = 0) {
//     this.point = point
//     this.size = size
//     this.rotation = rotation
//     makeObservable(this)
//   }

//   @computed get minX() {
//     return this.point[0]
//   }

//   @computed get minY() {
//     return this.point[1]
//   }

//   @computed get width() {
//     return this.size[0]
//   }

//   @computed get height() {
//     return this.size[1]
//   }

//   @computed get maxX() {
//     return this.point[0] + this.size[0]
//   }

//   @computed get maxY() {
//     return this.point[1] + this.size[1]
//   }
// }

export interface TLNuHandle {
  id: string
  index: number
  point: number[]
}

export interface TLNuBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  rotation?: number
}

export abstract class TLNuPage<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
> {
  abstract id: string
  abstract name: string
  abstract shapes: Record<string, S>
  abstract bindings: Record<string, B>
  abstract selectedIds: string[]
  abstract hoveredId: string | null
  abstract camera: {
    point: number[]
    zoom: number
  }

  abstract hoveredShape?: S
  abstract selectedShapes: S[]
  abstract selectedBounds: TLNuBounds
}

export abstract class TLNuShape {
  showCloneHandles = false
  hideBounds = false
  isStateful = false

  abstract id: string
  abstract type: string
  abstract parentId: string
  abstract childIndex: number
  abstract name: string
  abstract point: number[]

  rotation?: number
  children?: string[]
  handles?: Record<string, TLNuHandle>
  isGhost?: boolean
  isHidden?: boolean
  isLocked?: boolean
  isGenerated?: boolean
  isAspectRatioLocked?: boolean
  ref?: React.RefObject<unknown>

  abstract Component: (props: {
    shape: TLNuShape
    isEditing: boolean
    isBinding: boolean
    isHovered: boolean
    isSelected: boolean
    meta: any
  }) => JSX.Element | null

  abstract Indicator: (props: {
    shape: TLNuShape
    isEditing: boolean
    isBinding: boolean
    isHovered: boolean
    isSelected: boolean
    meta: any
  }) => JSX.Element | null

  abstract get bounds(): TLNuBounds
  // abstract get isEditing(): boolean
  // abstract get isBinding(): boolean
  // abstract get isHovered(): boolean
  // abstract get isSelected(): boolean
}

export interface TLNuBinding {
  id: string
  toId: string
  fromId: string
}

export interface TLNuRendererProps<S extends TLNuShape, B extends TLNuBinding> {
  id?: string
  page: TLNuPage<S, B>
  onPan?: (delta: number[]) => void
}
