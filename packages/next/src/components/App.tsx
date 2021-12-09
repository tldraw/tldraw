/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuAppPropsWithoutApp, TLNuAppPropsWithApp } from '~types'
import { LiftedAppProvider } from './LiftedAppProvider'
import { ControlledAppProvider } from './ControlledAppProvider'
import type { TLNuShape } from '~nu-lib'

export const App = observer(function App<S extends TLNuShape>(
  props: TLNuAppPropsWithoutApp<S> | TLNuAppPropsWithApp<S>
): JSX.Element {
  if ('app' in props) return <LiftedAppProvider {...(props as TLNuAppPropsWithApp<S>)} />
  return <ControlledAppProvider {...(props as TLNuAppPropsWithoutApp<S>)} />
})
