import isMobile from 'ismobilejs'
import { useEffect } from 'react'
import state from 'state'

// Send event on iOS when a user presses the "Done" key while editing
// a text element.

function handleFocusOut() {
  state.send('BLURRED_EDITING_SHAPE')
}

export default function useSafariFocusOutFix(): void {
  useEffect(() => {
    if (isMobile().apple) {
      document.addEventListener('focusout', handleFocusOut)

      return () => {
        document.removeEventListener('focusout', handleFocusOut)
      }
    }
  }, [])
}
