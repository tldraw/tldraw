/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import type { TLBinding, TLShapeProps } from '@tldraw/core'
import type { TLShape, TLShapeUtil, TLHandle } from '@tldraw/core'
import type { TLPage, TLPageState } from '@tldraw/core'
import type { StoreApi } from 'zustand'
import type { Command, Patch } from 'rko'

export type TLStore = StoreApi<Data>

export type TLChange = Data

export type TLDrawPage = TLPage<TLDrawShape, TLDrawBinding>

export interface TLDrawDocument {
  id: string
  pages: Record<string, TLDrawPage>
  pageStates: Record<string, TLPageState>
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
}

export interface TLDrawMeta {
  isDarkMode: boolean
}

export type TLDrawShapeProps<T extends TLDrawShape, E extends Element> = TLShapeProps<
  T,
  E,
  TLDrawMeta
>

export interface Data {
  document: TLDrawDocument
  settings: TLDrawSettings
  appState: {
    selectedStyle: ShapeStyles
    currentStyle: ShapeStyles
    currentPageId: string
    pages: Pick<TLPage<TLDrawShape, TLDrawBinding>, 'id' | 'name' | 'childIndex'>[]
    hoveredId?: string
    activeTool: TLDrawShapeType | 'select'
    activeToolType?: TLDrawToolType | 'select'
    isToolLocked: boolean
    isStyleOpen: boolean
    isEmptyCanvas: boolean
    status: { current: TLDrawStatus; previous: TLDrawStatus }
  }
}

export type TLDrawPatch = Patch<Data>

export type TLDrawCommand = Command<Data>

export type PagePartial = {
  shapes: Patch<TLDrawPage['shapes']>
  bindings: Patch<TLDrawPage['bindings']>
}

export interface SelectHistory {
  pointer: number
  stack: string[][]
}

export interface Session {
  id: string
  status: TLDrawStatus
  start: (data: Readonly<Data>, ...args: any[]) => TLDrawPatch | undefined
  update: (data: Readonly<Data>, ...args: any[]) => TLDrawPatch | undefined
  complete: (data: Readonly<Data>, ...args: any[]) => TLDrawPatch | TLDrawCommand | undefined
  cancel: (data: Readonly<Data>, ...args: any[]) => TLDrawPatch | undefined
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

export enum TLDrawToolType {
  Draw = 'draw',
  Bounds = 'bounds',
  Point = 'point',
  Handle = 'handle',
  Points = 'points',
  Text = 'text',
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
  Arrow = 'Arrow',
}

export interface TLDrawBaseShape extends TLShape {
  style: ShapeStyles
  type: TLDrawShapeType
}

export interface DrawShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Draw
  points: number[][]
}

export interface ArrowShape extends TLDrawBaseShape {
  type: TLDrawShapeType.Arrow
  bend: number
  handles: {
    start: TLHandle
    bend: TLHandle
    end: TLHandle
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

export type TLDrawShapeUtil<T extends TLDrawShape> = TLShapeUtil<
  T,
  any,
  TLDrawMeta,
  {
    toolType: TLDrawToolType
  }
>

export type ArrowBinding = TLBinding<{
  handleId: keyof ArrowShape['handles']
  distance: number
  point: number[]
}>

export type TLDrawBinding = ArrowBinding

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
