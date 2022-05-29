import * as React from 'react'
import { Tooltip } from '~components/Primitives/Tooltip'
import { useTldrawApp } from '~hooks'
import { ToolButton } from '~components/Primitives/ToolButton'
import { TrashIcon } from '~components/Primitives/icons'
import { useIntl } from 'react-intl'

export function DeleteButton() {
  const app = useTldrawApp()
  const intl = useIntl()

  const handleDelete = React.useCallback(() => {
    app.delete()
  }, [app])

  const hasSelection = app.useStore(
    (s) =>
      s.appState.status === 'idle' &&
      s.document.pageStates[s.appState.currentPageId].selectedIds.length > 0
  )

  return (
    <Tooltip label={intl.formatMessage({ id: 'delete' })} kbd="⌫" id="TD-Delete">
      <ToolButton variant="circle" disabled={!hasSelection} onSelect={handleDelete}>
        <TrashIcon />
      </ToolButton>
    </Tooltip>
  )
}
