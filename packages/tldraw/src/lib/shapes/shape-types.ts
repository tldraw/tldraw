import { TLShape, TLShapeUtils } from '@tldraw/core'

export interface EllipseShape extends TLShape {
  type: 'ellipse'
  radius: number[]
}

export interface RectangleShape extends TLShape {
  type: 'rectangle'
  size: number[]
  style: ShapeStyles
  radius?: number
}

export type TLDrawShape = RectangleShape | EllipseShape

export type TLDrawShapeUtils = TLShapeUtils<TLDrawShape>

export type ShapeType = TLDrawShape['type']

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
}

export type Theme = 'dark' | 'light'
