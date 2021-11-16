import * as React from 'react'
import { Tooltip } from '~components/Tooltip'
import { useTldrawApp } from '~hooks'
import { ToolButton } from '~components/ToolButton'
import { TrashIcon } from '~components/icons'
import { GHOSTED_OPACITY } from '~constants'

export function DeleteButton(): JSX.Element {
  const app = useTldrawApp()

  const handleDelete = React.useCallback(() => {
    app.delete()
  }, [app])

  const hasSelection = app.useStore(
    (s) => s.document.pageStates[s.appState.currentPageId].selectedIds.length > 0
  )

  return (
    <Tooltip label="Delete" kbd="⌫">
      <ToolButton variant="circle" disabled={!hasSelection} onSelect={handleDelete}>
        <TrashIcon opacity={hasSelection ? 1 : GHOSTED_OPACITY} />
      </ToolButton>
    </Tooltip>
  )
}
