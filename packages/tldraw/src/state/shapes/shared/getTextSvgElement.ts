import type { TLBounds } from '@tldraw/core'
import { AlignStyle, StickyShape, TextShape } from '~types'
import { getFontSize, getFontStyle } from '.'
import { getTextAlign } from './getTextAlign'

export function getTextSvgElement(shape: TextShape | StickyShape, bounds: TLBounds) {
  const { text, style } = shape
  const font = getFontStyle(shape.style)
  const fontSize = getFontSize(shape.style.size, shape.style.font)

  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')

  const LINE_HEIGHT = fontSize * 1.3

  const textLines = text.split('\n').map((line, i) => {
    const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElm.textContent = line
    textElm.setAttribute('font', font)
    textElm.setAttribute('font-size', fontSize + 'px')
    textElm.setAttribute('text-anchor', 'start')
    textElm.setAttribute('alignment-baseline', 'central')
    textElm.setAttribute('text-align', getTextAlign(style.textAlign))
    textElm.setAttribute('y', LINE_HEIGHT * (0.5 + i) + '')
    g.appendChild(textElm)

    return textElm
  })

  if (style.textAlign === AlignStyle.Middle) {
    textLines.forEach((textElm) => {
      textElm.setAttribute('x', bounds.width / 2 + '')
      textElm.setAttribute('text-align', 'center')
      textElm.setAttribute('text-anchor', 'middle')
    })
  } else if (style.textAlign === AlignStyle.End) {
    textLines.forEach((textElm) => {
      textElm.setAttribute('x', bounds.width + '')
      textElm.setAttribute('text-align', 'right')
      textElm.setAttribute('text-anchor', 'end')
    })
  }

  return g
}
