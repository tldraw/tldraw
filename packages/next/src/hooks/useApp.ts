import * as React from 'react'
import type { TLNuAppPropsWithoutApp, TLNuAppPropsWithApp } from '~types'
import { TLNuApp, TLNuShape } from '~nu-lib'

export function useApp<S extends TLNuShape, R extends TLNuApp<S> = TLNuApp<S>>(
  props: TLNuAppPropsWithoutApp<S> | TLNuAppPropsWithApp<S, R>
) {
  if ('app' in props) return props.app
  const [app] = React.useState<R>(
    () => new TLNuApp(props.model, props.shapeClasses, props.toolClasses) as R
  )
  return app
}
