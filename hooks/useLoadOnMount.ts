import { useEffect } from 'react'
import state from 'state'

export default function useLoadOnMount() {
  useEffect(() => {
    const fonts = (document as any).fonts

    fonts
      .load('12px Verveine Regular', 'Fonts are loaded!')
      .then(() => state.send('MOUNTED'))

    return () => {
      state.send('UNMOUNTED')
    }
  }, [])
}
