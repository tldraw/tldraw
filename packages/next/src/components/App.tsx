/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuAppPropsWithoutApp, TLNuAppPropsWithApp } from '~types'
import { LiftedApp } from './LiftedApp'
import { ControlledApp } from './ControlledApp'

export const App = observer(function App(
  props: TLNuAppPropsWithoutApp | TLNuAppPropsWithApp
): JSX.Element {
  if ('app' in props) return <LiftedApp {...(props as TLNuAppPropsWithApp)} />
  return <ControlledApp {...(props as TLNuAppPropsWithoutApp)} />
})
