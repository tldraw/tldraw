import * as React from 'react'
import { observer } from 'mobx-react-lite'
import { ToolBar } from './ToolBar'
import { StatusBar } from './StatusBar'
import { useAppContext } from 'context'

export const AppUI = observer(function AppUI() {
  const app = useAppContext()

  if (!app) return null

  return (
    <>
      <ToolBar app={app} />
      <StatusBar app={app} />
    </>
  )
})
