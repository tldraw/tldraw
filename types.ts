import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

import React from 'react'

/* -------------------------------------------------- */
/*                    Client State                    */
/* -------------------------------------------------- */

export interface Data {
  isReadOnly: boolean
  settings: {
    fontSize: number
    isDarkMode: boolean
    isCodeOpen: boolean
    isStyleOpen: boolean
    nudgeDistanceSmall: number
    nudgeDistanceLarge: number
    isToolLocked: boolean
    isPenLocked: boolean
  }
  currentStyle: ShapeStyles
  camera: {
    point: number[]
    zoom: number
  }
  brush?: Bounds
  boundsRotation: number
  selectedIds: Set<string>
  pointedId?: string
  hoveredId?: string
  currentPageId: string
  currentCodeFileId: string
  codeControls: Record<string, CodeControl>
  document: {
    pages: Record<string, Page>
    code: Record<string, CodeFile>
  }
}

/* -------------------------------------------------- */
/*                      Document                      */
/* -------------------------------------------------- */

export interface Page {
  id: string
  type: 'page'
  childIndex: number
  name: string
  shapes: Record<string, Shape>
}

export enum ShapeType {
  Dot = 'dot',
  Circle = 'circle',
  Ellipse = 'ellipse',
  Line = 'line',
  Ray = 'ray',
  Polyline = 'polyline',
  Rectangle = 'rectangle',
  Draw = 'draw',
  Arrow = 'arrow',
}

// Consider:
// Glob = "glob",
// Spline = "spline",
// Cubic = "cubic",
// Conic = "conic",

export type ShapeStyles = Partial<React.SVGProps<SVGUseElement>>

export interface BaseShape {
  id: string
  type: ShapeType
  parentId: string
  childIndex: number
  isGenerated: boolean
  name: string
  point: number[]
  rotation: number
  bindings?: Record<string, ShapeBinding>
  handles?: Record<string, ShapeHandle>
  style: ShapeStyles
  isLocked: boolean
  isHidden: boolean
  isAspectRatioLocked: boolean
}

export interface DotShape extends BaseShape {
  type: ShapeType.Dot
}

export interface CircleShape extends BaseShape {
  type: ShapeType.Circle
  radius: number
}

export interface EllipseShape extends BaseShape {
  type: ShapeType.Ellipse
  radiusX: number
  radiusY: number
}

export interface LineShape extends BaseShape {
  type: ShapeType.Line
  direction: number[]
}

export interface RayShape extends BaseShape {
  type: ShapeType.Ray
  direction: number[]
}

export interface PolylineShape extends BaseShape {
  type: ShapeType.Polyline
  points: number[][]
}

export interface RectangleShape extends BaseShape {
  type: ShapeType.Rectangle
  size: number[]
  radius: number
}

export interface DrawShape extends BaseShape {
  type: ShapeType.Draw
  points: number[][]
}

export interface ArrowShape extends BaseShape {
  type: ShapeType.Arrow
  points: number[][]
  handles: Record<string, ShapeHandle>
  bend: number
  decorations?: {
    start: Decoration
    end: Decoration
    middle: Decoration
  }
}

export type MutableShape =
  | DotShape
  | CircleShape
  | EllipseShape
  | LineShape
  | RayShape
  | PolylineShape
  | DrawShape
  | RectangleShape
  | ArrowShape

export type Shape = Readonly<MutableShape>

export interface Shapes {
  [ShapeType.Dot]: Readonly<DotShape>
  [ShapeType.Circle]: Readonly<CircleShape>
  [ShapeType.Ellipse]: Readonly<EllipseShape>
  [ShapeType.Line]: Readonly<LineShape>
  [ShapeType.Ray]: Readonly<RayShape>
  [ShapeType.Polyline]: Readonly<PolylineShape>
  [ShapeType.Draw]: Readonly<DrawShape>
  [ShapeType.Rectangle]: Readonly<RectangleShape>
  [ShapeType.Arrow]: Readonly<ArrowShape>
}

export type ShapeByType<T extends ShapeType> = Shapes[T]

export interface CodeFile {
  id: string
  name: string
  code: string
}

export enum Decoration {
  Arrow,
}

export interface ShapeBinding {
  id: string
  index: number
  point: number[]
}

export interface ShapeHandle {
  id: string
  index: number
  point: number[]
}

/* -------------------------------------------------- */
/*                      Editor UI                     */
/* -------------------------------------------------- */

export interface PointerInfo {
  target: string
  pointerId: number
  origin: number[]
  point: number[]
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

export enum Edge {
  Top = 'top_edge',
  Right = 'right_edge',
  Bottom = 'bottom_edge',
  Left = 'left_edge',
}

export enum Corner {
  TopLeft = 'top_left_corner',
  TopRight = 'top_right_corner',
  BottomRight = 'bottom_right_corner',
  BottomLeft = 'bottom_left_corner',
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export interface RotatedBounds extends Bounds {
  rotation: number
}

export interface ShapeBounds extends Bounds {
  id: string
}

export interface PointSnapshot extends Bounds {
  nx: number
  nmx: number
  ny: number
  nmy: number
}

export interface BoundsSnapshot extends PointSnapshot {
  nw: number
  nh: number
}

export type Difference<A, B> = A extends B ? never : A

export type ShapeSpecificProps<T extends Shape> = Pick<
  T,
  Difference<keyof T, keyof BaseShape>
>

export type ShapeIndicatorProps<T extends Shape> = ShapeSpecificProps<T>

export type ShapeUtil<K extends Shape> = {
  create(props: Partial<K>): K
  getBounds(shape: K): Bounds
  hitTest(shape: K, test: number[]): boolean
  hitTestBounds(shape: K, bounds: Bounds): boolean
  rotate(shape: K): K
  translate(shape: K, delta: number[]): K
  scale(shape: K, scale: number): K
  stretch(shape: K, scaleX: number, scaleY: number): K
  render(shape: K): JSX.Element
}

export enum MoveType {
  Backward,
  Forward,
  ToFront,
  ToBack,
}

export enum AlignType {
  Top,
  CenterVertical,
  Bottom,
  Left,
  CenterHorizontal,
  Right,
}

export enum StretchType {
  Horizontal,
  Vertical,
}

export enum DistributeType {
  Horizontal,
  Vertical,
}

/* -------------------------------------------------- */
/*                     Code Editor                    */
/* -------------------------------------------------- */

export type IMonaco = typeof monaco

export type IMonacoEditor = monaco.editor.IStandaloneCodeEditor

export enum ControlType {
  Number = 'number',
  Vector = 'vector',
  Text = 'text',
  Select = 'select',
}

export interface BaseCodeControl {
  id: string
  type: ControlType
  label: string
}

export interface NumberCodeControl extends BaseCodeControl {
  type: ControlType.Number
  min?: number
  max?: number
  value: number
  step: number
  format?: (value: number) => number
}

export interface VectorCodeControl extends BaseCodeControl {
  type: ControlType.Vector
  value: number[]
  isNormalized: boolean
  format?: (value: number[]) => number[]
}

export interface TextCodeControl extends BaseCodeControl {
  type: ControlType.Text
  value: string
  format?: (value: string) => string
}

export interface SelectCodeControl<T extends string = ''>
  extends BaseCodeControl {
  type: ControlType.Select
  value: T
  options: T[]
  format?: (string: T) => string
}

export type CodeControl =
  | NumberCodeControl
  | VectorCodeControl
  | TextCodeControl
  | SelectCodeControl

export type PropsOfType<T extends object, K> = {
  [K in keyof T]: T[K] extends boolean ? K : never
}[keyof T]
