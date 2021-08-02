import * as React from 'react'
import { TertiaryButton, TertiaryButtonsContainer } from './shared'
import { Undo, Redo, Trash } from '../icons'
import { useTLDrawContext } from '../../hooks'

export const UndoRedo = React.memo((): JSX.Element => {
  const { tlstate } = useTLDrawContext()

  return (
    <TertiaryButtonsContainer bp={{ '@initial': 'mobile', '@sm': 'small' }}>
      <TertiaryButton label="Undo" kbd="#Z" onClick={tlstate.undo}>
        <Undo />
      </TertiaryButton>
      <TertiaryButton label="Redo" kbd="#⇧" onClick={tlstate.redo}>
        <Redo />
      </TertiaryButton>
      <TertiaryButton label="Delete" kbd="⌫" onClick={tlstate.clear}>
        <Trash />
      </TertiaryButton>
    </TertiaryButtonsContainer>
  )
})
