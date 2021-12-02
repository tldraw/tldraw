/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuApp } from '@tldraw/next'
import type { Shape } from 'stores'

interface StatusBarProps {
  app: TLNuApp<Shape>
}

export const StatusBar = observer(function StatusBar({ app }: StatusBarProps) {
  return (
    <div className="tlnu-debug">
      {app.selectedTool.toolId} | {app.selectedTool.currentState.stateId}
    </div>
  )
})
