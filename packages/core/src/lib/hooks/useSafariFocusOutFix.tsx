import Utils from '../utils'
import { useEffect } from 'react'
import { useTLState } from './useTLState'

// Send event on iOS when a user presses the "Done" key while editing a text element.

export function useSafariFocusOutFix(): void {
  const state = useTLState()

  useEffect(() => {
    function handleFocusOut() {
      state.send('BLURRED_EDITING_SHAPE')
    }

    if (!Utils.isMobile()) return

    document.addEventListener('focusout', handleFocusOut)
    return () => document.removeEventListener('focusout', handleFocusOut)
  }, [state])
}
