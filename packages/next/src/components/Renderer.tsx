/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import { useStylesheet } from '~hooks/useStylesheet'
import { nuContext, NuContext } from '~hooks/useContext'
import { Canvas } from './Canvas'
import type { TLNuBinding, TLNuRendererProps, TLNuShape } from '~types'

export const Renderer = observer(function Renderer<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
>({ page, onPan }: TLNuRendererProps<S, B>): JSX.Element {
  useStylesheet()

  const [currentContext, setCurrentContext] = React.useState<NuContext>({
    callbacks: {
      onPan,
    },
  })

  React.useEffect(() => {
    autorun(() => {
      setCurrentContext({
        callbacks: {
          onPan,
        },
      })
    })
  }, [])

  return (
    <nuContext.Provider value={currentContext}>
      <div className="nu-container">
        <Canvas page={page} />
      </div>
    </nuContext.Provider>
  )
})
