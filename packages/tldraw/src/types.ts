import type { TLPage, TLPageState, TLSettings } from '@tldraw/core'
import type {
  TLDrawShape,
  ShapeStyles,
  TLDrawShapeType,
  TLDrawToolType,
  TLDrawBinding,
} from './shape'

export interface TLDrawDocument {
  id: string
  pages: Record<string, TLPage<TLDrawShape, TLDrawBinding>>
  pageStates: Record<string, TLPageState>
}

export interface TLDrawSettings extends TLSettings {
  isReadonlyMode: boolean
  nudgeDistanceSmall: number
  nudgeDistanceLarge: number
}

export interface Data {
  page: TLPage<TLDrawShape, TLDrawBinding>
  pageState: TLPageState
  settings: TLDrawSettings
  appState: {
    currentStyle: ShapeStyles
    currentPageId: string
    activeTool: TLDrawShapeType | 'select'
    activeToolType?: TLDrawToolType | 'select'
    isToolLocked: boolean
    isStyleOpen: boolean
    isEmptyCanvas: boolean
  }
}

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
