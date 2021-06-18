import { Data, Shape } from 'types'
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
}

export default new Clipboard()
