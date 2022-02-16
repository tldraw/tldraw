import type { TLBounds } from '@tldraw/core'
import { AlignStyle, ShapeStyles } from '~types'
import { getSVGFontFace, getFontSize } from './shape-styles'
import { getTextAlign } from './getTextAlign'
import { LINE_HEIGHT, LETTER_SPACING } from '~constants'

export function getTextSvgElement(text: string, style: ShapeStyles, bounds: TLBounds) {
  const scale: number = style.scale !== undefined ? style.scale : 1
  const fontSize = getFontSize(style.size, style.font) * scale
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const textLines = text.split('\n').map((line, i) => {
    const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElm.textContent = line
    textElm.setAttribute('y', LINE_HEIGHT * fontSize * (0.5 + i) + '')
    g.appendChild(textElm)
    return textElm
  })
  g.setAttribute('font-size', fontSize + '')
  g.setAttribute('font-family', getSVGFontFace(style.font))
  g.setAttribute('text-align', getTextAlign(style.textAlign))
  g.setAttribute('letter-spacing', LETTER_SPACING)
  switch (style.textAlign) {
    case AlignStyle.Middle: {
      g.setAttribute('text-align', 'center')
      g.setAttribute('text-anchor', 'middle')
      textLines.forEach((textElm) => textElm.setAttribute('x', bounds.width / 2 +4+ ''))
      break
    }
    case AlignStyle.End: {
      g.setAttribute('text-align', 'right')
      g.setAttribute('text-anchor', 'end')
      textLines.forEach((textElm) => textElm.setAttribute('x', bounds.width  +4+ ''))
      break
    }
    case AlignStyle.Start: {
      g.setAttribute('text-anchor', 'start')
      g.setAttribute('alignment-baseline', 'central')
      textLines.forEach((textElm) => textElm.setAttribute('x', 4 + ''))
    }
  }
  return g
}
