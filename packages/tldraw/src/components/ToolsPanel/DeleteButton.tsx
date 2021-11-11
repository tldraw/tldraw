import * as React from 'react'
import { Tooltip } from '~components/Tooltip'
import { useTLDrawContext } from '~hooks'
import { ToolButton } from '~components/ToolButton'
import { TrashIcon } from '~components/icons'

export function DeleteButton(): JSX.Element {
  const { state } = useTLDrawContext()

  const handleDelete = React.useCallback(() => {
    state.delete()
  }, [state])

  return (
    <Tooltip label="Delete" kbd="⌫">
      <ToolButton variant="circle" onSelect={handleDelete}>
        <TrashIcon />
      </ToolButton>
    </Tooltip>
  )
}
