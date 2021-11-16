import * as React from 'react'
import { Tooltip } from '~components/Tooltip'
import { useTldrawApp } from '~hooks'
import { ToolButton } from '~components/ToolButton'
import { TrashIcon } from '~components/icons'

export function DeleteButton(): JSX.Element {
  const app = useTldrawApp()

  const handleDelete = React.useCallback(() => {
    app.delete()
  }, [app])

  return (
    <Tooltip label="Delete" kbd="⌫">
      <ToolButton variant="circle" onSelect={handleDelete}>
        <TrashIcon />
      </ToolButton>
    </Tooltip>
  )
}
