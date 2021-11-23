import { LETTER_SPACING } from '~constants'
import type { TDShape } from '~types'
import { getFontStyle } from '.'

export class TextMeasure {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  elm?: HTMLPreElement

  constructor() {
    if (typeof window !== 'undefined') {
      document.getElementById('__textMeasure')?.remove()

      this.elm = document.createElement('pre')
      this.elm.id = '__textMeasure'
      this.elm.tabIndex = -1

      Object.assign(this.elm.style, {
        whiteSpace: 'pre',
        width: 'auto',
        border: '1px solid transparent',
        padding: '4px',
        margin: '0px',
        letterSpacing: `${LETTER_SPACING}px`,
        opacity: '0',
        position: 'absolute',
        top: '-500px',
        left: '0px',
        zIndex: '9999',
        pointerEvents: 'none',
        userSelect: 'none',
        alignmentBaseline: 'mathematical',
        dominantBaseline: 'mathematical',
      })

      document.body.appendChild(this.elm)
    }
  }

  getBounds = (shape: TDShape) => {
    if (!(this.elm && 'text' in shape))
      return { minX: 0, minY: 0, maxX: 10, maxY: 10, width: 10, height: 10 }

    if (this.elm.innerHTML !== shape.text) {
      this.elm.innerHTML = `${shape.text}&zwj;`
    }

    const font = getFontStyle(shape.style)

    if (this.elm.style.font !== font) {
      this.elm.style.font = font
    }

    // In tests, offsetWidth and offsetHeight will be 0
    const width = this.elm.offsetWidth || 1
    const height = this.elm.offsetHeight || 1

    return {
      minX: 0,
      maxX: width,
      minY: 0,
      maxY: height,
      width,
      height,
    }
  }
}
