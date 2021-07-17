/* -------------------------------------------------- */
/*                      Utilities                     */
/* -------------------------------------------------- */

export type Difference<A, B, C = A> = A extends B ? never : C

export type Intersection<A, B, C = A> = A extends B ? C : never

export type FilteredKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T]

/* -------------------------------------------------- */
/*                    Client State                    */
/* -------------------------------------------------- */

export type Theme = 'dark' | 'light'

export interface Data {
  isReadOnly: boolean
  settings: {
    fontSize: number
    isCodeOpen: boolean
    isTestMode: boolean
    isDebugOpen: boolean
    isDebugMode: boolean
    isStyleOpen: boolean
    isDarkMode: boolean
    nudgeDistanceSmall: number
    nudgeDistanceLarge: number
    isToolLocked: boolean
    isPenLocked: boolean
  }
  room?: {
    id: string
    status: string
    peers: Record<string, CoopPresence>
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
  currentBinding?: {
    id: string
    point: number[]
  }
  codeControls: Record<string, CodeControl>
  document: TLDocument
  pageStates: Record<string, PageState>
}

/* -------------------------------------------------- */
/*                      Document                      */
/* -------------------------------------------------- */

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
  selectedIds: string[]
  camera: {
    point: number[]
    zoom: number
  }
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

export interface ShapeTreeNode {
  shape: Shape
  children: ShapeTreeNode[]
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

/* -------------------------------------------------- */
/*                        Coop                        */
/* -------------------------------------------------- */

export type CoopPresence = {
  id: string
  bufferedXs: number[]
  bufferedYs: number[]
  times: number[]
  duration: number
  pageId: string
}

/* -------------------------------------------------- */
/*                       Shapes                       */
/* -------------------------------------------------- */

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
  Draw = 'Draw',
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
  name: string
  point: number[]
  style: ShapeStyles
  rotation: number
  children?: string[]
  points?: number[][]
  bindings?: string[]
  handles?: Record<string, ShapeHandle>
  isLocked?: boolean
  isHidden?: boolean
  isEditing?: boolean
  isGenerated?: boolean
  isAspectRatioLocked?: boolean
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
  bend: number
  handles: {
    start: ShapeHandle
    bend: ShapeHandle
    end: ShapeHandle
  }
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

export type Shape =
  | DotShape
  | EllipseShape
  | LineShape
  | RayShape
  | PolylineShape
  | RectangleShape
  | DrawShape
  | ArrowShape
  | TextShape
  | GroupShape

export interface RectangleShape extends BaseShape {
  type: ShapeType.Rectangle
  size: number[]
  radius: number
}

export interface DrawShape extends BaseShape {
  type: ShapeType.Draw
  points: number[][]
}

export type MappedByType<U extends string, T extends { type: U }> = {
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}

export type MutableShapes = MappedByType<ShapeType, Shape>

export type ReadonlyMap<T> = { [P in keyof T]: Readonly<T[P]> }

export type Shapes = ReadonlyMap<MutableShapes>

export type ShapeByType<T extends keyof Shapes> = Shapes[T]

export type ShapeProps<T extends Shape> = {
  [P in keyof T]?: P extends 'style' ? Partial<T[P]> : T[P]
}

/* -------- Decorations, Handles and Bindings ------- */

export enum Decoration {
  Arrow = 'Arrow',
}

export enum BindingType {
  Direction = 'Direction',
  Point = 'Point',
}

export interface DirectionShapeBinding {
  type: BindingType.Direction
  id: string
  point: number[]
  distance: number
}

export interface PointShapeBinding {
  type: BindingType.Point
  id: string
  point: number[]
}

export type ShapeBinding = DirectionShapeBinding | PointShapeBinding

export enum BindingChangeType {
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
}

export type BindingChange =
  | {
      type: BindingChangeType.Create
      id: string
      handleId: string
      binding: ShapeBinding
    }
  | {
      type: BindingChangeType.Update
      id: string
      bounds: Bounds
    }
  | {
      type: BindingChangeType.Delete
      id: string
    }

export interface ShapeHandle {
  id: string
  index: number
  point: number[]
  canBind?: boolean
  binding?: ShapeBinding
}

/* ------------------ Types by Prop ----------------- */

export type RequiredKeys<T> = {
  [K in keyof T]-?: Difference<Record<string, unknown>, Pick<T, K>, K>
}[keyof T]

export type MembersWithRequiredKey<T, U> = {
  [P in keyof T]: Intersection<U, RequiredKeys<T[P]>, T[P]>
}[keyof T]

export type ShapesWithProp<U> = MembersWithRequiredKey<MutableShapes, U>

export type ShapesWithHandles = ShapesWithProp<'handles'>

export type ShapesWithPoints = ShapesWithProp<'points'>

export type ParentShape = ShapesWithProp<'children'>

export type ParentTypes = ParentShape['type'] | 'page'

/* -------------------------------------------------- */
/*                      Editor UI                     */
/* -------------------------------------------------- */

export interface PointerInfo<T extends string = any> {
  target: T
  pointerId: number
  origin: number[]
  point: number[]
  pressure: number
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

export interface KeyboardInfo {
  key: string
  keys: string[]
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

export type ShapeSpecificProps<T extends Shape> = Pick<
  T,
  Difference<keyof T, keyof BaseShape>
>

export type ShapeIndicatorProps<T extends Shape> = ShapeSpecificProps<T>

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

export type PropsOfType<T extends Shape, U> = {
  [K in keyof T]: T[K] extends any ? (T[K] extends U ? K : never) : never
}[keyof T]

export type Mutable<T extends Shape> = { -readonly [K in keyof T]: T[K] }

export interface ShapeUtility<K extends Shape> {
  // Default properties when creating a new shape
  defaultProps: K

  // A cache for the computed bounds of this kind of shape.
  boundsCache: WeakMap<K, Bounds>

  // Whether to show transform controls when this shape is selected.
  canTransform: boolean

  // Whether the shape's aspect ratio can change.
  canChangeAspectRatio: boolean

  // Whether the shape's style can be filled.
  canStyleFill: boolean

  // Whether the shape may be bound to.
  canBind: boolean

  // Whether the shape may be edited in an editing mode
  canEdit: boolean

  // Whether the shape is a foreign object.
  isForeignObject: boolean

  // Whether the shape can contain other shapes.
  isParent: boolean

  // Whether the shape is only shown when on hovered.
  isShy: boolean

  // Create a new shape.
  create(this: ShapeUtility<K>, props: Partial<K>): K

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

  // Given a point and a direction, return the shape's bound point.
  getBindingPoint(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    point: number[],
    origin: number[],
    direction: number[]
  ): number[] | undefined

  // Respond when a user moves one of the shape's bound elements.
  onBindingChange(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    change: BindingChange
  ): ShapeUtility<K>

  // Respond when a user moves one of the shape's handles.
  onHandleChange(
    this: ShapeUtility<K>,
    shape: Mutable<K>,
    handle: Partial<K['handles']>,
    info?: Partial<{
      delta: number[]
      shiftKey: boolean
      altKey: boolean
      metaKey: boolean
    }>
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
    info?: {
      isEditing?: boolean
      isHovered?: boolean
      isSelected?: boolean
      isCurrentParent?: boolean
      isDarkMode?: boolean
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
