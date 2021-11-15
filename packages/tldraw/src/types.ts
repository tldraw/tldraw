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
import type { StoreApi } from 'zustand'
import type { Command, Patch } from 'rko'
import type { FileSystemHandle } from '~state/data/browser-fs-access'

export interface TLDrawHandle extends TLHandle {
  canBind?: boolean
  bindingId?: string
}

export interface TLDrawTransformInfo<T extends TLShape> {
  type: TLBoundsEdge | TLBoundsCorner
  initialShape: T
  scaleX: number
  scaleY: number
  transformOrigin: number[]
}

// old
export type TLStore = StoreApi<TLDrawSnapshot>

export type TLChange = TLDrawSnapshot

export type TLDrawPage = TLPage<TLDrawShape, TLDrawBinding>

export interface TLDrawDocument {
  id: string
  name: string
  pages: Record<string, TLDrawPage>
  pageStates: Record<string, TLPageState>
  version: number
}

export interface TLDrawSettings {
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

export enum TLUserStatus {
  Idle = 'idle',
  Connecting = 'connecting',
  Connected = 'connected',
  Disconnected = 'disconnected',
}

export interface TLDrawMeta {
  isDarkMode: boolean
}

export interface TLDrawUser extends TLUser<TLDrawShape> {
  activeShapes: TLDrawShape[]
}

export type TLDrawShapeProps<T extends TLDrawShape, E extends Element> = TLShapeProps<
  T,
  E,
  TLDrawMeta
>

export interface TLDrawSnapshot {
  settings: TLDrawSettings
  appState: {
    selectedStyle: ShapeStyles
    currentStyle: ShapeStyles
    currentPageId: string
    pages: Pick<TLPage<TLDrawShape, TLDrawBinding>, 'id' | 'name' | 'childIndex'>[]
    hoveredId?: string
    activeTool: TLDrawToolType
    isToolLocked: boolean
    isStyleOpen: boolean
    isEmptyCanvas: boolean
    status: string
    snapLines: TLSnapLine[]
  }
  document: TLDrawDocument
  room?: {
    id: string
    userId: string
    users: Record<string, TLDrawUser>
  }
}

export type TLDrawPatch = Patch<TLDrawSnapshot>

export type TLDrawCommand = Command<TLDrawSnapshot>

export type PagePartial = {
  shapes: Patch<TLDrawPage['shapes']>
  bindings: Patch<TLDrawPage['bindings']>
}

export interface SelectHistory {
  pointer: number
  stack: string[][]
}

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

export class TLDrawEventHandler {
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

export enum TLDrawStatus {
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ParametersExceptFirst<F> = F extends (arg0: any, ...rest: infer R) => any ? R : never

export type ExceptFirst<T extends unknown[]> = T extends [any, ...infer U] ? U : never

export type ExceptFirstTwo<T extends unknown[]> = T extends [any, any, ...infer U] ? U : never

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

export enum TLDrawShapeType {
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

export interface TLDrawBaseShape extends TLShape {
  style: ShapeStyles
  type: TLDrawShapeType
  handles?: Record<string, TLDrawHandle>
}

export interface DrawShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Draw
  points: number[][]
  isComplete: boolean
}

export interface ArrowShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Arrow
  bend: number
  handles: {
    start: TLDrawHandle
    bend: TLDrawHandle
    end: TLDrawHandle
  }
  decorations?: {
    start?: Decoration
    end?: Decoration
    middle?: Decoration
  }
}

export interface EllipseShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Ellipse
  radius: number[]
}

export interface RectangleShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Rectangle
  size: number[]
}

export interface TextShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Text
  text: string
}

export interface GroupShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Group
  size: number[]
  children: string[]
}

export interface StickyShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Sticky
  size: number[]
  text: string
}

export type TLDrawShape =
  | RectangleShape
  | EllipseShape
  | DrawShape
  | ArrowShape
  | TextShape
  | GroupShape
  | StickyShape

export interface ArrowBinding extends TLBinding {
  handleId: keyof ArrowShape['handles']
  distance: number
  point: number[]
}

export type TLDrawBinding = ArrowBinding

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

export type PropsOfType<U> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in keyof TLDrawShape]: TLDrawShape[K] extends any
    ? TLDrawShape[K] extends U
      ? K
      : never
    : never
}[keyof TLDrawShape]

export type Theme = 'dark' | 'light'

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
  MappedByType<TLDrawShapeType, TLDrawShape>,
  U
>

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

export type TLDrawToolType =
  | 'select'
  | 'erase'
  | TLDrawShapeType.Text
  | TLDrawShapeType.Draw
  | TLDrawShapeType.Ellipse
  | TLDrawShapeType.Rectangle
  | TLDrawShapeType.Arrow
  | TLDrawShapeType.Sticky

/* ------------------- File System ------------------ */

export interface TLDrawFile {
  name: string
  fileHandle: FileSystemHandle | null
  document: TLDrawDocument
  assets: Record<string, unknown>
}
