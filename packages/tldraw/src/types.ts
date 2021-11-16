/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type {
  TLBinding,
  TLBoundsCorner,
  TLBoundsEdge,
  TLShapeProps,
  TLShape,
  TLHandle,
  TLSnapLine,
  TLPinchEventHandler,
  TLKeyboardEventHandler,
  TLPointerEventHandler,
  TLWheelEventHandler,
  TLCanvasEventHandler,
  TLBoundsEventHandler,
  TLBoundsHandleEventHandler,
  TLShapeBlurHandler,
  TLShapeCloneHandler,
} from '@tldraw/core'
import type { TLPage, TLUser, TLPageState } from '@tldraw/core'
import type { Command, Patch } from 'rko'
import type { FileSystemHandle } from '~state/data/browser-fs-access'

// A base class for all classes that handle events from the Renderer,
// including TldrawApp and all Tools.
export class TldrawEventHandler {
  onPinchStart?: TLPinchEventHandler
  onPinchEnd?: TLPinchEventHandler
  onPinch?: TLPinchEventHandler
  onKeyDown?: TLKeyboardEventHandler
  onKeyUp?: TLKeyboardEventHandler
  onPointerMove?: TLPointerEventHandler
  onPointerUp?: TLPointerEventHandler
  onPan?: TLWheelEventHandler
  onZoom?: TLWheelEventHandler
  onPointerDown?: TLPointerEventHandler
  onPointCanvas?: TLCanvasEventHandler
  onDoubleClickCanvas?: TLCanvasEventHandler
  onRightPointCanvas?: TLCanvasEventHandler
  onDragCanvas?: TLCanvasEventHandler
  onReleaseCanvas?: TLCanvasEventHandler
  onPointShape?: TLPointerEventHandler
  onDoubleClickShape?: TLPointerEventHandler
  onRightPointShape?: TLPointerEventHandler
  onDragShape?: TLPointerEventHandler
  onHoverShape?: TLPointerEventHandler
  onUnhoverShape?: TLPointerEventHandler
  onReleaseShape?: TLPointerEventHandler
  onPointBounds?: TLBoundsEventHandler
  onDoubleClickBounds?: TLBoundsEventHandler
  onRightPointBounds?: TLBoundsEventHandler
  onDragBounds?: TLBoundsEventHandler
  onHoverBounds?: TLBoundsEventHandler
  onUnhoverBounds?: TLBoundsEventHandler
  onReleaseBounds?: TLBoundsEventHandler
  onPointBoundsHandle?: TLBoundsHandleEventHandler
  onDoubleClickBoundsHandle?: TLBoundsHandleEventHandler
  onRightPointBoundsHandle?: TLBoundsHandleEventHandler
  onDragBoundsHandle?: TLBoundsHandleEventHandler
  onHoverBoundsHandle?: TLBoundsHandleEventHandler
  onUnhoverBoundsHandle?: TLBoundsHandleEventHandler
  onReleaseBoundsHandle?: TLBoundsHandleEventHandler
  onPointHandle?: TLPointerEventHandler
  onDoubleClickHandle?: TLPointerEventHandler
  onRightPointHandle?: TLPointerEventHandler
  onDragHandle?: TLPointerEventHandler
  onHoverHandle?: TLPointerEventHandler
  onUnhoverHandle?: TLPointerEventHandler
  onReleaseHandle?: TLPointerEventHandler
  onShapeBlur?: TLShapeBlurHandler
  onShapeClone?: TLShapeCloneHandler
}

// The shape of the TldrawApp's React (zustand) store
export interface TldrawSnapshot {
  settings: {
    isDarkMode: boolean
    isDebugMode: boolean
    isPenMode: boolean
    isReadonlyMode: boolean
    isZoomSnap: boolean
    nudgeDistanceSmall: number
    nudgeDistanceLarge: number
    isFocusMode: boolean
    isSnapping: boolean
    showRotateHandles: boolean
    showBindingHandles: boolean
    showCloneHandles: boolean
  }
  appState: {
    selectedStyle: ShapeStyles
    currentStyle: ShapeStyles
    currentPageId: string
    pages: Pick<TLPage<TldrawShape, TldrawBinding>, 'id' | 'name' | 'childIndex'>[]
    hoveredId?: string
    activeTool: TldrawToolType
    isToolLocked: boolean
    isStyleOpen: boolean
    isEmptyCanvas: boolean
    status: string
    snapLines: TLSnapLine[]
  }
  document: TldrawDocument
  room?: {
    id: string
    userId: string
    users: Record<string, TldrawUser>
  }
}

export type TldrawPatch = Patch<TldrawSnapshot>

export type TldrawCommand = Command<TldrawSnapshot>

// The shape of the files stored in JSON
export interface TldrawFile {
  name: string
  fileHandle: FileSystemHandle | null
  document: TldrawDocument
  assets: Record<string, unknown>
}

// The shape of the Tldraw document
export interface TldrawDocument {
  id: string
  name: string
  version: number
  pages: Record<string, TldrawPage>
  pageStates: Record<string, TLPageState>
}

// The shape of a single page in the Tldraw document
export type TldrawPage = TLPage<TldrawShape, TldrawBinding>

// A partial of a TldrawPage, used for commands / patches
export type PagePartial = {
  shapes: Patch<TldrawPage['shapes']>
  bindings: Patch<TldrawPage['bindings']>
}

// The meta information passed to TldrawShapeUtil components
export interface TldrawMeta {
  isDarkMode: boolean
}

// The type of info given to shapes when transforming
export interface TldrawTransformInfo<T extends TLShape> {
  type: TLBoundsEdge | TLBoundsCorner
  initialShape: T
  scaleX: number
  scaleY: number
  transformOrigin: number[]
}

// The status of a TldrawUser
export enum TLUserStatus {
  Idle = 'idle',
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

// A TldrawUser, for multiplayer rooms
export interface TldrawUser extends TLUser<TldrawShape> {
  activeShapes: TldrawShape[]
  status: TLUserStatus
}

export type Theme = 'dark' | 'light'

export enum SessionType {
  Transform = 'transform',
  Translate = 'translate',
  TransformSingle = 'transformSingle',
  Brush = 'brush',
  Arrow = 'arrow',
  Draw = 'draw',
  Erase = 'erase',
  Rotate = 'rotate',
  Handle = 'handle',
  Grid = 'grid',
}

export enum TldrawStatus {
  Idle = 'idle',
  PointingHandle = 'pointingHandle',
  PointingBounds = 'pointingBounds',
  PointingBoundsHandle = 'pointingBoundsHandle',
  TranslatingHandle = 'translatingHandle',
  Translating = 'translating',
  Transforming = 'transforming',
  Rotating = 'rotating',
  Pinching = 'pinching',
  Brushing = 'brushing',
  Creating = 'creating',
  EditingText = 'editing-text',
}

export type TldrawToolType =
  | 'select'
  | 'erase'
  | TldrawShapeType.Text
  | TldrawShapeType.Draw
  | TldrawShapeType.Ellipse
  | TldrawShapeType.Rectangle
  | TldrawShapeType.Arrow
  | TldrawShapeType.Sticky

export type Easing =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeInQuart'
  | 'easeOutQuart'
  | 'easeInOutQuart'
  | 'easeInQuint'
  | 'easeOutQuint'
  | 'easeInOutQuint'
  | 'easeInSine'
  | 'easeOutSine'
  | 'easeInOutSine'
  | 'easeInExpo'
  | 'easeOutExpo'
  | 'easeInOutExpo'

export enum MoveType {
  Backward = 'backward',
  Forward = 'forward',
  ToFront = 'toFront',
  ToBack = 'toBack',
}

export enum AlignType {
  Top = 'top',
  CenterVertical = 'centerVertical',
  Bottom = 'bottom',
  Left = 'left',
  CenterHorizontal = 'centerHorizontal',
  Right = 'right',
}

export enum StretchType {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export enum DistributeType {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

export enum FlipType {
  Horizontal = 'horizontal',
  Vertical = 'vertical',
}

/* -------------------------------------------------- */
/*                       Shapes                       */
/* -------------------------------------------------- */

export enum TldrawShapeType {
  Sticky = 'sticky',
  Ellipse = 'ellipse',
  Rectangle = 'rectangle',
  Draw = 'draw',
  Arrow = 'arrow',
  Text = 'text',
  Group = 'group',
}

export enum Decoration {
  Arrow = 'arrow',
}

export interface TldrawBaseShape extends TLShape {
  style: ShapeStyles
  type: TldrawShapeType
  handles?: Record<string, TldrawHandle>
}

// The shape created with the draw tool
export interface DrawShape extends TldrawBaseShape {
  type: TldrawShapeType.Draw
  points: number[][]
  isComplete: boolean
}

// The extended handle (used for arrows)
export interface TldrawHandle extends TLHandle {
  canBind?: boolean
  bindingId?: string
}

// The shape created with the arrow tool
export interface ArrowShape extends TldrawBaseShape {
  type: TldrawShapeType.Arrow
  bend: number
  handles: {
    start: TldrawHandle
    bend: TldrawHandle
    end: TldrawHandle
  }
  decorations?: {
    start?: Decoration
    end?: Decoration
    middle?: Decoration
  }
}

export interface ArrowBinding extends TLBinding {
  handleId: keyof ArrowShape['handles']
  distance: number
  point: number[]
}

export type TldrawBinding = ArrowBinding

// The shape created by the ellipse tool
export interface EllipseShape extends TldrawBaseShape {
  type: TldrawShapeType.Ellipse
  radius: number[]
}

// The shape created by the rectangle tool
export interface RectangleShape extends TldrawBaseShape {
  type: TldrawShapeType.Rectangle
  size: number[]
}

// The shape created by the text tool
export interface TextShape extends TldrawBaseShape {
  type: TldrawShapeType.Text
  text: string
}

// The shape created by the sticky tool
export interface StickyShape extends TldrawBaseShape {
  type: TldrawShapeType.Sticky
  size: number[]
  text: string
}

// The shape created when multiple shapes are grouped
export interface GroupShape extends TldrawBaseShape {
  type: TldrawShapeType.Group
  size: number[]
  children: string[]
}

// A union of all shapes
export type TldrawShape =
  | RectangleShape
  | EllipseShape
  | DrawShape
  | ArrowShape
  | TextShape
  | GroupShape
  | StickyShape

/* ------------------ Shape Styles ------------------ */

export enum ColorStyle {
  White = 'white',
  LightGray = 'lightGray',
  Gray = 'gray',
  Black = 'black',
  Green = 'green',
  Cyan = 'cyan',
  Blue = 'blue',
  Indigo = 'indigo',
  Violet = 'violet',
  Red = 'red',
  Orange = 'orange',
  Yellow = 'yellow',
}

export enum SizeStyle {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
}

export enum DashStyle {
  Draw = 'draw',
  Solid = 'solid',
  Dashed = 'dashed',
  Dotted = 'dotted',
}

export enum FontSize {
  Small = 'small',
  Medium = 'medium',
  Large = 'large',
  ExtraLarge = 'extraLarge',
}

export type ShapeStyles = {
  color: ColorStyle
  size: SizeStyle
  dash: DashStyle
  isFilled?: boolean
  scale?: number
}

/* -------------------------------------------------- */
/*                    Type Helpers                    */
/* -------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never

export type ExceptFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never

export type ExceptFirstTwo<T extends unknown[]> = T extends [any, any, ...infer U] ? U : never

export type PropsOfType<U> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof TldrawShape]: TldrawShape[K] extends any
    ? TldrawShape[K] extends U
      ? K
      : never
    : never
}[keyof TldrawShape]

export type Difference<A, B, C = A> = A extends B ? never : C

export type Intersection<A, B, C = A> = A extends B ? C : never

export type FilteredKeys<T, U> = {
  [P in keyof T]: T[P] extends U ? P : never
}[keyof T]

export type RequiredKeys<T> = {
  [K in keyof T]-?: Difference<Record<string, unknown>, Pick<T, K>, K>
}[keyof T]

export type MembersWithRequiredKey<T, U> = {
  [P in keyof T]: Intersection<U, RequiredKeys<T[P]>, T[P]>
}[keyof T]

export type MappedByType<U extends string, T extends { type: U }> = {
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}

export type ShapesWithProp<U> = MembersWithRequiredKey<
  MappedByType<TldrawShapeType, TldrawShape>,
  U
>
