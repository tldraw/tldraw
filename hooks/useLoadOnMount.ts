/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect } from 'react'
import state from 'state'

export default function useLoadOnMount(roomId?: string) {
  useEffect(() => {
    const fonts = (document as any).fonts

    fonts.load('12px Verveine Regular', 'Fonts are loaded!').then(() => {
      state.send('MOUNTED')

      if (roomId !== undefined) {
        state.send('RT_LOADED_ROOM', { id: roomId })
      }
    })

    return () => {
      state.send('UNMOUNTED')
      state.send('RT_UNLOADED_ROOM', { id: roomId })
    }
  }, [roomId])
}
