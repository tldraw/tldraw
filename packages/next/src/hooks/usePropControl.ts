import * as React from 'react'
import type { TLNuAppPropsWithoutApp, TLNuAppPropsWithApp } from '~types'
import type { TLNuApp, TLNuShape } from '~nu-lib'

export function usePropControl<S extends TLNuShape, R extends TLNuApp<S> = TLNuApp<S>>(
  app: R,
  props: TLNuAppPropsWithoutApp<S> | TLNuAppPropsWithApp<S, R>
) {
  React.useEffect(() => {
    if (!('model' in props)) return
    if (props.model) app.history.deserialize(props.model)
  }, [(props as TLNuAppPropsWithoutApp<S>).model])
}
