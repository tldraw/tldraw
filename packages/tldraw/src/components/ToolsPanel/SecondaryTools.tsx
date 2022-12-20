import * as React from 'react'
import { useIntl } from 'react-intl'
import { ToolPanel } from '~components/Primitives/Panel'
import { ToolButton } from '~components/Primitives/ToolButton'
import { Tooltip } from '~components/Primitives/Tooltip'
import { UndoBackIcon, UndoForwardIcon } from '~components/Primitives/icons/icoCommon'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'
import { TDSnapshot } from '~types'
import { DeleteButton } from './DeleteButton'

const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

export const SecondaryTools = React.memo(function SecondaryTools() {
  const intl = useIntl()
  const app = useTldrawApp()
  const dockPosition = app.useStore(dockPositionState)

  const panelStyle = dockPosition === 'bottom' || dockPosition === 'top' ? 'row' : 'column'

  return (
    <ToolPanel id="TD-SecondaryTools" panelStyle={panelStyle}>
      {app.readOnly ? (
        <ReadOnlyLabel>Read Only</ReadOnlyLabel>
      ) : (
        <>
          <Tooltip label={intl.formatMessage({ id: 'undo' })} kbd="#Z" id="TD-Undo">
            <ToolButton variant="primary">
              <UndoBackIcon onClick={app.undo} />
            </ToolButton>
          </Tooltip>
          <Tooltip label={intl.formatMessage({ id: 'redo' })} kbd="#⇧Z" id="TD-Redo">
            <ToolButton variant="primary">
              <UndoForwardIcon onClick={app.redo} />
            </ToolButton>
          </Tooltip>
        </>
      )}
      <DeleteButton />
    </ToolPanel>
  )
})

const ReadOnlyLabel = styled('div', {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: '$ui',
  fontSize: '$1',
  paddingLeft: '$4',
  paddingRight: '$1',
  userSelect: 'none',
})
