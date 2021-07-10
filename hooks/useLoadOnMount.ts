/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useEffect } from 'react'
import state from 'state'
// import coopState from 'state/coop/coop-state'

export default function useLoadOnMount(roomId?: string) {
  useEffect(() => {
    if ('fonts' in document) {
      const fonts = (document as any).fonts
      fonts.load('12px Verveine Regular', 'Fonts are loaded!').then(() => {
        state.send('MOUNTED', { roomId })

        // if (roomId !== undefined) {
        //   state.send('RT_LOADED_ROOM', { id: roomId })
        //   coopState.send('JOINED_ROOM', { id: roomId })
        // }
      })
    } else {
      setTimeout(() => state.send('MOUNTED'), 1000)
    }

    return () => {
      state.send('UNMOUNTED', { roomId })
      // coopState.send('LEFT_ROOM', { id: roomId })
    }
  }, [roomId])
}
