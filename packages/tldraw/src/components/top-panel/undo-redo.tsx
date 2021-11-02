import * as React from 'react'
import { Redo, Undo, ToolButton } from '~components'
import { useTLDrawContext } from '~hooks'

export function UndoRedo() {
  const { tlstate } = useTLDrawContext()

  return (
    <>
      <ToolButton label="Undo" kbd="#Z" isActive={false} onClick={tlstate.undo}>
        <Undo />
      </ToolButton>
      <ToolButton label="Redo" kbd="#⇧Z" isActive={false} onClick={tlstate.redo}>
        <Redo />
      </ToolButton>
    </>
  )
}
