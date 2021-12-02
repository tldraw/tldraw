/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuApp } from '@tldraw/next'
import type { Shape } from 'stores'
import { ToolBar } from './ToolBar'
import { StatusBar } from './StatusBar'

interface AppUIProps {
  app: TLNuApp<Shape>
}

export const AppUI = observer(function AppUI({ app }: AppUIProps) {
  return (
    <>
      <ToolBar app={app} />
      <StatusBar app={app} />
    </>
  )
})
