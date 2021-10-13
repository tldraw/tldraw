import * as React from 'react'
import { useTLDrawContext } from '~hooks'
import { TertiaryButton, tertiaryButtonsContainer } from '~components/tools-panel/styled'
import { Undo, Redo, Trash } from '~components/icons'

export const UndoRedo = React.memo((): JSX.Element => {
  const { tlstate } = useTLDrawContext()

  const handleDelete = React.useCallback(() => {
    tlstate.delete()
  }, [tlstate])

  const handleClear = React.useCallback(() => {
    tlstate.clear()
  }, [tlstate])

  return (
    <div className={tertiaryButtonsContainer({ bp: { '@initial': 'mobile', '@sm': 'small' } })}>
      <TertiaryButton label="Undo" kbd="#Z" onClick={tlstate.undo}>
        <Undo />
      </TertiaryButton>
      <TertiaryButton label="Redo" kbd="#⇧" onClick={tlstate.redo}>
        <Redo />
      </TertiaryButton>
      <TertiaryButton label="Delete" kbd="⌫" onClick={handleDelete} onDoubleClick={handleClear}>
        <Trash />
      </TertiaryButton>
    </div>
  )
})
