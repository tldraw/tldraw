import { getShapeUtils } from 'lib/shape-utils'
import { Data, Shape } from 'types'
import { getCommonBounds, getSelectedIds, getSelectedShapes } from 'utils/utils'
import state from './state'

class Clipboard {
  current: string
  fallback = false

  copy = (shapes: Shape[], onComplete?: () => void) => {
    this.current = JSON.stringify({ id: 'tldr', shapes })

    navigator.permissions.query({ name: 'clipboard-write' }).then((result) => {
      if (result.state == 'granted' || result.state == 'prompt') {
        navigator.clipboard.writeText(this.current).then(onComplete, () => {
          console.warn('Error, could not copy to clipboard. Fallback?')
          this.fallback = true
        })
      } else {
        this.fallback = true
      }
    })
  }

  paste = () => {
    navigator.clipboard
      .readText()
      .then(this.sendPastedTextToState, this.sendPastedTextToState)
  }

  sendPastedTextToState(text = this.current) {
    if (text === undefined) return

    try {
      const clipboardData = JSON.parse(text)
      state.send('PASTED_SHAPES_FROM_CLIPBOARD', {
        shapes: clipboardData.shapes,
      })
    } catch (e) {
      // The text wasn't valid JSON, or it wasn't ours, so paste it as a text object
      state.send('PASTED_TEXT_FROM_CLIPBOARD', { text })
    }
  }

  clear = () => {
    this.current = undefined
  }

  copySelectionToSvg(data: Data) {
    const shapes = getSelectedShapes(data)

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    shapes
      .sort((a, b) => a.childIndex - b.childIndex)
      .forEach((shape) => {
        const group = document.getElementById(shape.id + '-group')
        const node = document.getElementById(shape.id)

        const groupClone = group.cloneNode()
        groupClone.appendChild(node.cloneNode(true))

        svg.appendChild(groupClone)
      })

    const bounds = getCommonBounds(
      ...shapes.map((shape) => getShapeUtils(shape).getBounds(shape))
    )

    // No content
    if (!bounds) return

    const padding = 16

    // Resize the element to the bounding box
    svg.setAttribute(
      'viewBox',
      [
        bounds.minX - padding,
        bounds.minY - padding,
        bounds.width + padding * 2,
        bounds.height + padding * 2,
      ].join(' ')
    )

    svg.setAttribute('width', String(bounds.width))
    svg.setAttribute('height', String(bounds.height))

    // Take a snapshot of the element
    const s = new XMLSerializer()
    const svgString = s.serializeToString(svg)

    // Copy to clipboard!
    try {
      navigator.clipboard.writeText(svgString)
    } catch (e) {
      Clipboard.copyStringToClipboard(svgString)
    }
  }

  static copyStringToClipboard(string: string) {
    let textarea: HTMLTextAreaElement
    let result: boolean | null

    textarea = document.createElement('textarea')
    textarea.setAttribute('position', 'fixed')
    textarea.setAttribute('top', '0')
    textarea.setAttribute('readonly', 'true')
    textarea.setAttribute('contenteditable', 'true')
    textarea.style.position = 'fixed'
    textarea.value = string
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()

    try {
      const range = document.createRange()
      range.selectNodeContents(textarea)

      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)

      textarea.setSelectionRange(0, textarea.value.length)
      result = document.execCommand('copy')
    } catch (err) {
      result = null
    } finally {
      document.body.removeChild(textarea)
    }

    if (!result) return false

    return true
  }
}

export default new Clipboard()
