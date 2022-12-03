import { LETTER_SPACING } from '~constants'
import { AlignStyle } from '~types'

// https://drafts.csswg.org/css-text/#word-separator
// split on any of these characters
const wordSeparator = new RegExp(
  `${[0x0020, 0x00a0, 0x1361, 0x10100, 0x10101, 0x1039, 0x1091]
    .map((c) => String.fromCodePoint(c))
    .join('|')}`
)

export function getTextSvgElement(
  text: string,
  fontSize: number,
  fontFamily: string,
  textAlign: AlignStyle,
  width: number,
  wrap = false
) {
  const fontWeight = 'normal'
  const lineHeight = 1
  const letterSpacingPct = LETTER_SPACING

  // Collect lines

  const lines = breakText({
    text,
    wrap,
    width,
    fontSize,
    fontWeight,
    fontFamily,
    fontStyle: 'normal',
    textAlign: 'left',
    letterSpacing: LETTER_SPACING,
    lineHeight: 1,
  })

  const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
  textElm.setAttribute('font-size', fontSize + 'px')
  textElm.setAttribute('font-family', fontFamily)
  textElm.setAttribute('font-weight', fontWeight)
  textElm.setAttribute('line-height', lineHeight * fontSize + 'px')
  textElm.setAttribute('letter-spacing', letterSpacingPct)
  textElm.setAttribute('text-align', textAlign ?? 'left')
  textElm.setAttribute('dominant-baseline', 'mathematical')
  textElm.setAttribute('alignment-baseline', 'mathematical')

  const textLines = lines.map((line, i) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
    tspan.textContent = line + '\n'
    tspan.setAttribute('y', lineHeight * fontSize * (i + 0.5) + 'px')
    textElm.appendChild(tspan)
    return tspan
  })

  switch (textAlign) {
    case AlignStyle.Middle: {
      textElm.setAttribute('text-align', 'center')
      textElm.setAttribute('text-anchor', 'middle')
      textLines.forEach((textElm) => textElm.setAttribute('x', width / 2 + ''))
      break
    }
    case AlignStyle.End: {
      textElm.setAttribute('text-align', 'right')
      textElm.setAttribute('text-anchor', 'end')
      textLines.forEach((textElm) => textElm.setAttribute('x', -4 + width + ''))
      break
    }
    default: {
      textElm.setAttribute('text-align', 'left')
      textElm.setAttribute('text-anchor', 'start')
      textLines.forEach((textElm) => textElm.setAttribute('x', 4 + ''))
    }
  }

  return textElm
}

function breakText(opts: {
  text: string
  wrap: boolean
  width: number
  fontSize: number
  fontWeight: string
  fontFamily: string
  fontStyle: string
  lineHeight: number
  letterSpacing: string
  textAlign: string
}): string[] {
  const textElm = document.createElement('div')
  textElm.style.setProperty('position', 'absolute')
  textElm.style.setProperty('top', '-9999px')
  textElm.style.setProperty('left', '-9999px')
  textElm.style.setProperty('width', opts.width + 'px')
  textElm.style.setProperty('height', 'min-content')
  textElm.style.setProperty('font-size', opts.fontSize + 'px')
  textElm.style.setProperty('font-family', opts.fontFamily)
  textElm.style.setProperty('font-weight', opts.fontWeight)
  textElm.style.setProperty('line-height', opts.lineHeight * opts.fontSize + 'px')
  textElm.style.setProperty('letter-spacing', opts.letterSpacing)
  textElm.style.setProperty('text-align', opts.textAlign)
  document.body.appendChild(textElm)

  // Collect lines

  // Split the text into words
  const words = opts.text
    .split(wordSeparator)
    .flatMap((word) => word.replace('\n', ' \n'))
    .join(' ')
    .split(' ')

  // Iterate through the words looking for either line breaks, or
  // when the measured line exceeds the width of the container (minus
  // its padding); at either point, create a new line.

  textElm.innerText = words[0]
  let prevHeight = textElm.offsetHeight

  let currentLine = [words[0]]
  const lines: string[][] = [currentLine]

  for (let i = 1; i < words.length; i++) {
    const word = words[i]
    textElm.innerText += ' ' + word
    const newHeight = textElm.offsetHeight
    if (newHeight > prevHeight) {
      prevHeight = newHeight
      currentLine = []
      lines.push(currentLine)
    }

    // Push the current word to the current line
    currentLine.push(word)
  }

  textElm.remove()

  return lines.map((line) => line.join(' '))
}
