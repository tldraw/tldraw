// import { getShapeUtils } from './shape-utils'
// import { Data, Shape } from 'types'
// import { getCommonBounds } from 'utils'
// import tld from 'utils/tld'
// import state from './state'

export class Clipboard {
  //   current: string
  //   fallback = false
  //   copy = (shapes: Shape[], onComplete?: () => void) => {
  //     if (shapes === undefined) return
  //     this.current = JSON.stringify({ id: 'tldr', shapes })
  //     if ('permissions' in navigator && 'clipboard' in navigator) {
  //       navigator.permissions
  //         .query({ name: 'clipboard-write' })
  //         .then((result) => {
  //           if (result.state == 'granted' || result.state == 'prompt') {
  //             navigator.clipboard.writeText(this.current).then(onComplete, () => {
  //               console.warn('Error, could not copy to clipboard. Fallback?')
  //               this.fallback = true
  //             })
  //           } else {
  //             this.fallback = true
  //           }
  //         })
  //     }
  //   }
  //   paste = () => {
  //     try {
  //       navigator.clipboard.readText().then(this.sendPastedTextToState)
  //     } catch (e) {
  //       this.fallback = true
  //     }
  //     return this
  //   }
  //   sendPastedTextToState = (text = this.current) => {
  //     if (text === undefined) return
  //     try {
  //       const clipboardData = JSON.parse(text)
  //       state.send('PASTED_SHAPES_FROM_CLIPBOARD', {
  //         shapes: clipboardData.shapes,
  //       })
  //     } catch (e) {
  //       // The text wasn't valid JSON, or it wasn't ours, so paste it as a text object
  //       state.send('PASTED_TEXT_FROM_CLIPBOARD', { text })
  //     }
  //     return this
  //   }
  //   clear = () => {
  //     this.current = undefined
  //     return this
  //   }
  //   copySelectionToSvg(data: Data) {
  //     const shapes = tld.getSelectedShapes(data)
  //     const shapesToCopy = shapes.length > 0 ? shapes : tld.getShapes(data)
  //     const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  //     if (shapesToCopy.length === 0) return
  //     shapesToCopy
  //       .sort((a, b) => a.childIndex - b.childIndex)
  //       .forEach((shape) => {
  //         const group = document.getElementById(shape.id)
  //         const groupClone = group.cloneNode(true)
  //         // TODO: Add children if the shape is a group
  //         svg.appendChild(groupClone)
  //       })
  //     const bounds = getCommonBounds(
  //       ...shapesToCopy.map((shape) => getShapeUtils(shape).getBounds(shape))
  //     )
  //     // No content
  //     if (!bounds) return
  //     const padding = 16
  //     // Resize the element to the bounding box
  //     svg.setAttribute(
  //       'viewBox',
  //       [
  //         bounds.minX - padding,
  //         bounds.minY - padding,
  //         bounds.width + padding * 2,
  //         bounds.height + padding * 2,
  //       ].join(' ')
  //     )
  //     svg.setAttribute('width', String(bounds.width))
  //     svg.setAttribute('height', String(bounds.height))
  //     // Take a snapshot of the element
  //     const s = new XMLSerializer()
  //     const svgString = s
  //       .serializeToString(svg)
  //       .replaceAll('&#10;      ', '')
  //       .replaceAll(/((\s|")[0-9]*\.[0-9]{2})([0-9]*)(\b|"|\))/g, '$1')
  //     // Copy to clipboard!
  //     try {
  //       navigator.clipboard.writeText(svgString)
  //     } catch (e) {
  //       this.copyStringToClipboard(svgString)
  //     }
  //     return this
  //   }
  //   copyStringToClipboard = (string: string) => {
  //     try {
  //       navigator.clipboard.writeText(string)
  //     } catch (e) {
  //       const textarea = document.createElement('textarea')
  //       textarea.setAttribute('position', 'fixed')
  //       textarea.setAttribute('top', '0')
  //       textarea.setAttribute('readonly', 'true')
  //       textarea.setAttribute('contenteditable', 'true')
  //       textarea.style.position = 'fixed'
  //       textarea.value = string
  //       document.body.appendChild(textarea)
  //       textarea.focus()
  //       textarea.select()
  //       try {
  //         const range = document.createRange()
  //         range.selectNodeContents(textarea)
  //         const sel = window.getSelection()
  //         sel.removeAllRanges()
  //         sel.addRange(range)
  //         textarea.setSelectionRange(0, textarea.value.length)
  //       } catch (err) {
  //         null // Could not copy to clipboard
  //       } finally {
  //         document.body.removeChild(textarea)
  //       }
  //     }
  //     return this
  //   }
}

// export default new Clipboard()
