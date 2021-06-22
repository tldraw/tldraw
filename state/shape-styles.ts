import { SVGProps } from 'react'
import { ColorStyle, DashStyle, ShapeStyles, SizeStyle } from 'types'

export const strokes: Record<ColorStyle, string> = {
  [ColorStyle.White]: 'rgba(248, 249, 250, 1.000)',
  [ColorStyle.LightGray]: 'rgba(224, 226, 230, 1.000)',
  [ColorStyle.Gray]: 'rgba(172, 181, 189, 1.000)',
  [ColorStyle.Black]: 'rgba(0,0,0, 1.000)',
  [ColorStyle.Green]: 'rgba(54, 178, 77, 1.000)',
  [ColorStyle.Cyan]: 'rgba(14, 152, 173, 1.000)',
  [ColorStyle.Blue]: 'rgba(28, 126, 214, 1.000)',
  [ColorStyle.Indigo]: 'rgba(66, 99, 235, 1.000)',
  [ColorStyle.Violet]: 'rgba(112, 72, 232, 1.000)',
  [ColorStyle.Red]: 'rgba(240, 63, 63, 1.000)',
  [ColorStyle.Orange]: 'rgba(247, 103, 6, 1.000)',
  [ColorStyle.Yellow]: 'rgba(245, 159, 0, 1.000)',
}

export const fills = {
  [ColorStyle.White]: 'rgba(224, 226, 230, 1.000)',
  [ColorStyle.LightGray]: 'rgba(255, 255, 255, 1.000)',
  [ColorStyle.Gray]: 'rgba(224, 226, 230, 1.000)',
  [ColorStyle.Black]: 'rgba(255, 255, 255, 1.000)',
  [ColorStyle.Green]: 'rgba(235, 251, 238, 1.000)',
  [ColorStyle.Cyan]: 'rgba(227, 250, 251, 1.000)',
  [ColorStyle.Blue]: 'rgba(231, 245, 255, 1.000)',
  [ColorStyle.Indigo]: 'rgba(237, 242, 255, 1.000)',
  [ColorStyle.Violet]: 'rgba(242, 240, 255, 1.000)',
  [ColorStyle.Red]: 'rgba(255, 245, 245, 1.000)',
  [ColorStyle.Orange]: 'rgba(255, 244, 229, 1.000)',
  [ColorStyle.Yellow]: 'rgba(255, 249, 219, 1.000)',
}

const strokeWidths = {
  [SizeStyle.Small]: 2,
  [SizeStyle.Medium]: 4,
  [SizeStyle.Large]: 8,
}

const dashArrays = {
  [DashStyle.Solid]: () => [1],
  [DashStyle.Dashed]: (sw: number) => [sw * 2, sw * 4],
  [DashStyle.Dotted]: (sw: number) => [0, sw * 3],
}

const fontSizes = {
  [SizeStyle.Small]: 24,
  [SizeStyle.Medium]: 48,
  [SizeStyle.Large]: 72,
  auto: 'auto',
}

export function getStrokeWidth(size: SizeStyle): number {
  return strokeWidths[size]
}

export function getStrokeDashArray(
  dash: DashStyle,
  strokeWidth: number
): number[] {
  return dashArrays[dash](strokeWidth)
}

export function getFontSize(size: SizeStyle): number {
  return fontSizes[size]
}

export function getFontStyle(scale: number, style: ShapeStyles): string {
  const fontSize = getFontSize(style.size)

  return `${fontSize * scale}px/1.4 Verveine Regular`
}

export function getShapeStyle(
  style: ShapeStyles
): Partial<SVGProps<SVGUseElement>> {
  const { color, size, isFilled } = style

  const strokeWidth = getStrokeWidth(size)

  return {
    stroke: strokes[color],
    fill: isFilled ? fills[color] : 'none',
    strokeWidth,
  }
}

export const defaultStyle = {
  color: ColorStyle.Black,
  size: SizeStyle.Medium,
  isFilled: false,
  dash: DashStyle.Solid,
}
