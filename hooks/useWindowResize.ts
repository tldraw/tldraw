import { useEffect } from 'react'
import state from 'state'

export default function useWindowResize(): void {
  useEffect(() => {
    function handleResize() {
      state.send('RESIZED_WINDOW')
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
}
