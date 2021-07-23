/* --------------------- Primary -------------------- */

import React from 'react'
import { BaseShape } from './shape'

export interface Data<T extends TLShape> {
  settings: TLSettings
  page: TLPage<T>
  pageState: TLPageState
  pointedId?: string
  hoveredId?: string
  editingId?: string
  editingBindingId?: string
  currentParentId: string
  brush?: Bounds
}

export interface TLDocument<T extends TLShape> {
  currentPageId: string
  pages: Record<string, TLPage<T>>
  pageStates: Record<string, TLPageState>
}

export interface TLPage<T extends TLShape> {
  id: string
  shapes: Record<string, T>
  bindings: Record<string, TLBinding<T>>
}

export interface TLPageState {
  id: string
  selectedIds: string[]
  camera: {
    point: number[]
    zoom: number
  }
}

export interface TLShape {
  id: string
  type: string
  parentId: string
  childIndex: number
  name: string
  point: number[]
  rotation: number
  children?: string[]
  isLocked?: boolean
  isHidden?: boolean
  isEditing?: boolean
  isGenerated?: boolean
  isAspectRatioLocked?: boolean
}

export type TLShapes<T extends TLShape> = MappedByType<T['type'], BaseShape<T>>

export interface TLRenderInfo {
  ref?: React.RefObject<HTMLElement>
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isBinding: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
}

export interface TLTool {
  id: string
  name: string
}

export interface TLBinding<T extends TLShape> {
  id: string
  type: T['type']
  toId: string
  fromId: string
}

export interface TLSettings {
  isReadonlyMode: boolean
  isDebugMode: boolean
  isDarkMode: boolean
  isPenMode: boolean
}

/* -------------------- Secondary ------------------- */

export interface ShapeTreeNode {
  shape: TLShape
  children: ShapeTreeNode[]
  isEditing: boolean
  isHovered: boolean
  isSelected: boolean
  isBinding: boolean
  isDarkMode: boolean
  isCurrentParent: boolean
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

export type Intersection = {
  didIntersect: boolean
  message: string
  points: number[][]
}

/* -------------------------------------------------- */
/*                         Inputs                     */
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

export interface KeyboardInfo {
  key: string
  keys: string[]
  shiftKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
}

/* -------------------------------------------------- */
/*                    Utility Types                   */
/* -------------------------------------------------- */

export type MappedByType<U extends string, T extends { type: U }> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in T['type']]: T extends any ? (P extends T['type'] ? T : never) : never
}
