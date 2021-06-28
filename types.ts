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
  room?: {
    id: string
    status: string
    peers: Record<string, Peer>
  }
  currentStyle: ShapeStyles
  activeTool: ShapeType | 'select'
  brush?: Bounds
  boundsRotation: number
  pointedId?: string
  hoveredId?: string
  editingId?: string
  currentPageId: string
  currentParentId: string
  currentCodeFileId: string
  codeControls: Record<string, CodeControl>
  document: TLDocument
  pageStates: Record<string, PageState>
}

/* -------------------------------------------------- */
/*                      Document                      */
/* -------------------------------------------------- */

export interface Peer {
  id: string
  cursor: {
    point: number[]
  }
}

export interface TLDocument {
  id: string
  name: string
  pages: Record<string, Page>
  code: Record<string, CodeFile>
}

export interface Page {
  id: string
  type: 'page'
  childIndex: number
  name: string
  shapes: Record<string, Shape>
}

export interface PageState {
  id: string
  selectedIds: Set<string>
  camera: {
    point: number[]
    zoom: number
  }
}

/* ----------------- Start Copy Here ---------------- */

export enum ShapeType {
  Dot = 'dot',
  Ellipse = 'ellipse',
  Line = 'line',
  Ray = 'ray',
  Polyline = 'polyline',
  Rectangle = 'rectangle',
  Draw = 'draw',
  Arrow = 'arrow',
  Text = 'text',
  Group = 'group',
}

export enum ColorStyle {
  White = 'White',
  LightGray = 'LightGray',
  Gray = 'Gray',
  Black = 'Black',
  Green = 'Green',
  Cyan = 'Cyan',
  Blue = 'Blue',
  Indigo = 'Indigo',
  Violet = 'Violet',
  Red = 'Red',
  Orange = 'Orange',
  Yellow = 'Yellow',
}

export enum SizeStyle {
  Small = 'Small',
  Medium = 'Medium',
  Large = 'Large',
}

export enum DashStyle {
  Solid = 'Solid',
  Dashed = 'Dashed',
  Dotted = 'Dotted',
}

export enum FontSize {
  Small = 'Small',
  Medium = 'Medium',
  Large = 'Large',
  ExtraLarge = 'ExtraLarge',
}

export type ShapeStyles = {
  color: ColorStyle
  size: SizeStyle
  dash: DashStyle
  isFilled: boolean
}

export interface BaseShape {
  id: string
  type: ShapeType
  parentId: string
  childIndex: number
  isGenerated: boolean
  name: string
  point: number[]
  style: ShapeStyles
  rotation: number
  children?: string[]
  bindings?: Record<string, ShapeBinding>
  handles?: Record<string, ShapeHandle>
  isLocked: boolean
  isHidden: boolean
  isAspectRatioLocked: boolean
}

export interface DotShape extends BaseShape {
  type: ShapeType.Dot
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
  handles: Record<string, ShapeHandle>
  bend: number
  decorations?: {
    start: Decoration
    end: Decoration
    middle: Decoration
  }
}

export interface TextShape extends BaseShape {
  type: ShapeType.Text
  text: string
  scale: number
}

export interface GroupShape extends BaseShape {
  type: ShapeType.Group
  children: string[]
  size: number[]
}

// type DeepPartial<T> = {
//   [P in keyof T]?: DeepPartial<T[P]>
// }

export type ShapeProps<T extends Shape> = {
  [P in keyof T]?: P extends 'style' ? Partial<T[P]> : T[P]
}

export type MutableShape =
  | DotShape
  | EllipseShape
  | LineShape
  | RayShape
  | PolylineShape
  | DrawShape
  | RectangleShape
  | ArrowShape
  | TextShape
  | GroupShape

export interface Shapes {
  [ShapeType.Dot]: Readonly<DotShape>
  [ShapeType.Ellipse]: Readonly<EllipseShape>
  [ShapeType.Line]: Readonly<LineShape>
  [ShapeType.Ray]: Readonly<RayShape>
  [ShapeType.Polyline]: Readonly<PolylineShape>
  [ShapeType.Draw]: Readonly<DrawShape>
  [ShapeType.Rectangle]: Readonly<RectangleShape>
  [ShapeType.Arrow]: Readonly<ArrowShape>
  [ShapeType.Text]: Readonly<TextShape>
  [ShapeType.Group]: Readonly<GroupShape>
}

export type Shape = Readonly<MutableShape>

export type ShapeByType<T extends ShapeType> = Shapes[T]

export enum Decoration {
  Arrow = 'Arrow',
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

export interface CodeFile {
  id: string
  name: string
  code: string
}

export interface CodeError {
  message: string
  line: number
  column: number
}

export interface CodeResult {
  shapes: Shape[]
  controls: CodeControl[]
  error: CodeError
}

/* -------------------------------------------------- */
/*                      Editor UI                     */
/* -------------------------------------------------- */

export interface PointerInfo {
  target: string
  pointerId: number
  origin: number[]
  point: number[]
  pressure: number
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
  rotation?: number
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

export interface BezierCurveSegment {
  start: number[]
  tangentStart: number[]
  normalStart: number[]
  pressureStart: number
  end: number[]
  tangentEnd: number[]
  normalEnd: number[]
  pressureEnd: number
}

/* -------------------------------------------------- */
/*                     Code Editor                    */
/* -------------------------------------------------- */

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
  value: number
  min?: number
  max?: number
  step?: number
  format?: (value: number) => number
}

export interface VectorCodeControl extends BaseCodeControl {
  type: ControlType.Vector
  value: number[]
  min?: number
  max?: number
  step?: number
  isNormalized?: boolean
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

export type PropsOfType<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends boolean ? K : never
}[keyof T]

export type Mutable<T extends Shape> = { -readonly [K in keyof T]: T[K] }

export interface ShapeUtility<K extends Shape> {
  // A cache for the computed bounds of this kind of shape.
  boundsCache: WeakMap<K, Bounds>

  // Whether to show transform controls when this shape is selected.
  canTransform: boolean

  // Whether the shape's aspect ratio can change.
  canChangeAspectRatio: boolean

  // Whether the shape's style can be filled.
  canStyleFill: boolean

  // Whether the shape may be edited in an editing mode
  canEdit: boolean

  // Whether the shape is a foreign object.
  isForeignObject: boolean

  // Whether the shape can contain other shapes.
  isParent: boolean

  // Whether the shape is only shown when on hovered.
  isShy: boolean

  // Create a new shape.
  create(props: Partial<K>): K

  // Update a shape's styles
  applyStyles(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    style: Partial<ShapeStyles>
  ): ShapeUtility<K>

  translateBy(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    point: number[]
  ): ShapeUtility<K>

  translateTo(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    point: number[]
  ): ShapeUtility<K>

  rotateBy(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    rotation: number
  ): ShapeUtility<K>

  rotateTo(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    rotation: number,
    delta: number
  ): ShapeUtility<K>

  // Transform to fit a new bounding box when more than one shape is selected.
  transform(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    bounds: Bounds,
    info: {
      type: Edge | Corner
      initialShape: K
      scaleX: number
      scaleY: number
      transformOrigin: number[]
    }
  ): ShapeUtility<K>

  // Transform a single shape to fit a new bounding box.
  transformSingle(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    bounds: Bounds,
    info: {
      type: Edge | Corner
      initialShape: K
      scaleX: number
      scaleY: number
      transformOrigin: number[]
    }
  ): ShapeUtility<K>

  setProperty<P extends keyof K>(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    prop: P,
    value: K[P]
  ): ShapeUtility<K>

  // Respond when any child of this shape changes.
  onChildrenChange(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    children: Shape[]
  ): ShapeUtility<K>

  // Respond when a user moves one of the shape's bound elements.
  onBindingChange(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    bindings: Record<string, ShapeBinding>
  ): ShapeUtility<K>

  // Respond when a user moves one of the shape's handles.
  onHandleChange(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    handle: Partial<K['handles']>
  ): ShapeUtility<K>

  onDoublePointHandle(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    handle: keyof K['handles'],
    info: PointerInfo
  ): ShapeUtility<K>

  // Respond when a user double clicks the shape's bounds.
  onBoundsReset(this: ShapeUtility<K>, shape: Mutable<K>): ShapeUtility<K>

  // Respond when a user double clicks the center of the shape.
  onDoubleFocus(this: ShapeUtility<K>, shape: Mutable<K>): ShapeUtility<K>

  // Clean up changes when a session ends.
  onSessionComplete(this: ShapeUtility<K>, shape: Mutable<K>): ShapeUtility<K>

  // Render a shape to JSX.
  render(
    this: ShapeUtility<K>,
    shape: K,
    info: {
      isEditing: boolean
      ref?: React.MutableRefObject<HTMLTextAreaElement>
    }
  ): JSX.Element

  invalidate(this: ShapeUtility<K>, shape: K): ShapeUtility<K>

  // Get the bounds of the a shape.
  getBounds(this: ShapeUtility<K>, shape: K): Bounds

  // Get the routated bounds of the a shape.
  getRotatedBounds(this: ShapeUtility<K>, shape: K): Bounds

  // Get the center of the shape
  getCenter(this: ShapeUtility<K>, shape: K): number[]

  // Test whether a point lies within a shape.
  hitTest(this: ShapeUtility<K>, shape: K, test: number[]): boolean

  // Test whether bounds collide with or contain a shape.
  hitTestBounds(this: ShapeUtility<K>, shape: K, bounds: Bounds): boolean

  // Get whether the shape should delete
  shouldDelete(this: ShapeUtility<K>, shape: K): boolean

  // Get whether the shape should render
  shouldRender(this: ShapeUtility<K>, shape: K, previous: K): boolean
}
