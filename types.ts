export interface Data {
  camera: {
    point: number[]
    zoom: number
  }
  brush?: Bounds
  currentPageId: string
  selectedIds: string[]
  pointedId?: string
  document: {
    pages: Record<string, Page>
  }
}

export interface Page {
  id: string
  type: "page"
  childIndex: number
  name: string
  shapes: Record<string, Shape>
}

export enum ShapeType {
  Circle = "circle",
  Ellipse = "ellipse",
  Square = "square",
  Rectangle = "rectangle",
  Line = "line",
  LineSegment = "lineSegment",
  Dot = "dot",
  Ray = "ray",
  Glob = "glob",
  Spline = "spline",
  Cubic = "cubic",
  Conic = "conic",
}

export interface BaseShape {
  id: string
  type: ShapeType
  parentId: string
  childIndex: number
  name: string
  rotation: 0
}

export interface DotShape extends BaseShape {
  type: ShapeType.Dot
  point: number[]
}

export interface CircleShape extends BaseShape {
  type: ShapeType.Circle
  point: number[]
  radius: number
}

export interface EllipseShape extends BaseShape {
  type: ShapeType.Ellipse
  point: number[]
  radiusX: number
  radiusY: number
}

export interface LineShape extends BaseShape {
  type: ShapeType.Line
  point: number[]
  vector: number[]
}

export interface RayShape extends BaseShape {
  type: ShapeType.Ray
  point: number[]
  vector: number[]
}

export interface LineSegmentShape extends BaseShape {
  type: ShapeType.LineSegment
  start: number[]
  end: number[]
}

export interface RectangleShape extends BaseShape {
  type: ShapeType.Rectangle
  point: number[]
  size: number[]
}

export type Shape =
  | CircleShape
  | EllipseShape
  | DotShape
  | LineShape
  | RayShape
  | LineSegmentShape
  | RectangleShape

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}
