import * as React from 'react'
import { useIntl } from 'react-intl'
import { ToolButton, ToolButtonWithTooltip } from '~components/Primitives/ToolButton'
import { Tooltip } from '~components/Primitives/Tooltip'
import { StickyIcon, Trash2Icon } from '~components/Primitives/icons'
import { useTldrawApp } from '~hooks'

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
      <ToolButton variant="primary" disabled={!hasSelection} onSelect={handleDelete}>
        <Trash2Icon />
      </ToolButton>
    </Tooltip>
  )
}
