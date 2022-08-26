import { TLBounds } from '@tldraw/core'
import { LETTER_SPACING, LINE_HEIGHT } from '~constants'
import { AlignStyle, ShapeStyles } from '~types'
import { getTextAlign } from './getTextAlign'
import { getTextLabelSize } from './getTextSize'
import { getFontFace, getFontSize, getFontStyle } from './shape-styles'

export function getTextSvgElement(
  text: string,
  fontSize: number,
  fontFamily: string,
  textAlign: AlignStyle,
  bounds: TLBounds,
  wrap = false
) {
  const fontWeight = 'normal'
  const lineHeight = 1
  const padding = 0
  const letterSpacingPct = LETTER_SPACING

  const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  textElm.setAttribute('font-size', fontSize + 'px')
  textElm.setAttribute('font-family', fontFamily)
  textElm.setAttribute('font-weight', fontWeight)
  textElm.setAttribute('line-height', lineHeight * fontSize + 'px')
  textElm.setAttribute('letter-spacing', letterSpacingPct)
  textElm.setAttribute('text-align', textAlign ?? 'left')
  textElm.setAttribute('dominant-baseline', 'mathematical')
  textElm.setAttribute('alignment-baseline', 'mathematical')

  let cvs: HTMLCanvasElement | null = null
  let ctx: CanvasRenderingContext2D | null = null

  // Create a canvas that we'll use to measure each line of text
  cvs = document.createElement('canvas')
  if (cvs) {
    ctx = cvs.getContext('2d')!

    if (ctx) {
      // Set the canvas context's font to match the CSS text
      ctx.font = `${fontSize}px ${fontFamily}`
      ctx.textAlign = textAlign === 'start' ? 'left' : textAlign === 'end' ? 'right' : 'center'
    }
  }

  // Collect lines

  const lines: string[][] = [[]]
  let currentLine = ''

  // Split the text into words
  const words = text
    .split(' ')
    .flatMap((word) => word.replace('\n', ' \n'))
    .join(' ')
    .split(' ')

  // Iterate through the words looking for either line breaks, or
  // when the measured line exceeds the width of the container (minus
  // its padding); at either point, create a new line.
  for (let word of words) {
    if (word.startsWith('\n')) {
      // Slice the newline off of the front of the current word
      word = word.slice(1)
      // Add a newline to the end of the current line
      lines[lines.length - 1].push('\n')
      // Create a new line
      lines.push([])
      // Set the current line to the word (and a space)
      currentLine = word + ' '
    } else {
      // Add the word (and a space) to the current line
      currentLine += word + ' '
      if (ctx && wrap) {
        const width = ctx.measureText(currentLine).width * 0.92
        // If the length of the new current line is greater than the bounds width
        if (width >= bounds.width - padding * 2) {
          lines[lines.length - 1].push('\n')
          lines.push([])
          currentLine = word + ' '
        }
        // todo: split and wrap words that are longer than the bounds width
      }
    }

    // Push the current word to the current line
    lines[lines.length - 1].push(word)
  }

  const textLines = lines.map((line, i) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
    tspan.textContent = line.join(' ')
    tspan.setAttribute('y', lineHeight * fontSize * (i + 0.5) + '')
    textElm.appendChild(tspan)
    return tspan
  })

  switch (textAlign) {
    case AlignStyle.Middle: {
      textElm.setAttribute('text-align', 'center')
      textElm.setAttribute('text-anchor', 'middle')
      textLines.forEach((textElm) => textElm.setAttribute('x', bounds.width / 2 + ''))
      break
    }
    case AlignStyle.End: {
      textElm.setAttribute('text-align', 'right')
      textElm.setAttribute('text-anchor', 'end')
      textLines.forEach((textElm) => textElm.setAttribute('x', bounds.width + ''))
      break
    }
    default: {
      textElm.setAttribute('text-align', 'left')
      textElm.setAttribute('text-anchor', 'start')
      textLines.forEach((textElm) => textElm.setAttribute('x', '0'))
    }
  }

  return textElm
}
