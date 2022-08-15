import type { TLBounds } from '@tldraw/core'
import { LINE_HEIGHT } from '~constants'
import { AlignStyle, ShapeStyles } from '~types'
import { getTextAlign } from './getTextAlign'
import { getTextLabelSize } from './getTextSize'
import { getFontFace, getFontSize, getFontStyle } from './shape-styles'

export function getTextSvgElement(text: string, style: ShapeStyles, bounds: TLBounds) {
  const fontSize = getFontSize(style.size, style.font)
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const scale = style.scale ?? 1

  const font = getFontStyle(style)
  const [, height] = getTextLabelSize(text, font)

  const textLines = text.split('\n').map((line, i) => {
    const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    textElm.textContent = line

    textElm.setAttribute('y', fontSize * (0.5 + i * LINE_HEIGHT) + '')
    textElm.setAttribute('letter-spacing', fontSize * -0.03 + '')
    textElm.setAttribute('font-size', fontSize + 'px')
    textElm.setAttribute('font-family', getFontFace(style.font).slice(1, -1))
    textElm.setAttribute('text-align', getTextAlign(style.textAlign))
    textElm.setAttribute('text-align', getTextAlign(style.textAlign))
    textElm.setAttribute('alignment-baseline', 'central')

    const [width] = getTextLabelSize(line, font)

    console.log(font, scale, width, bounds.width)

    textElm.setAttribute(
      'transform',
      `translate(${(bounds.width - width) / 2}, ${(bounds.height - height * scale) / 2})`
    )
    if (style.scale !== 1) {
      textElm.setAttribute('transform', `scale(${style.scale})`)
    }
    g.appendChild(textElm)

    return textElm
  })

  switch (style.textAlign) {
    case AlignStyle.Middle: {
      g.setAttribute('text-align', 'center')
      g.setAttribute('text-anchor', 'middle')
      textLines.forEach((textElm) => {
        textElm.setAttribute('x', bounds.width / 2 / scale + '')
      })
      break
    }
    case AlignStyle.End: {
      g.setAttribute('text-align', 'right')
      g.setAttribute('text-anchor', 'end')
      textLines.forEach((textElm) => textElm.setAttribute('x', bounds.width / scale + ''))
      break
    }
    case AlignStyle.Start: {
      g.setAttribute('text-align', 'left')
      g.setAttribute('text-anchor', 'start')
    }
  }

  return g
}
