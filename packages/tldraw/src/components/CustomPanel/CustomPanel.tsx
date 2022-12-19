import React from 'react'
import { ToolButton } from '~components/Primitives/ToolButton'
import { MinusIcon, PlusIcon } from '~components/Primitives/icons'
import { ActionButton } from '~components/ToolsPanel/ActionButton'
import { ZoomMenu } from '~components/TopPanel/ZoomMenu'
import { useTldrawApp } from '~hooks'
import { styled } from '~styles'

interface ToolsHelpPanelProps {
  showZoom: boolean
}

export const ToolsHelpPanel = React.memo(function ToolsHelpPanel({
  showZoom,
}: ToolsHelpPanelProps) {
  const app = useTldrawApp()
  return (
    <StyledToolsHelpPanel>
      <StyledActionButton>
        <ActionButton />
      </StyledActionButton>
      {showZoom && (
        <StyledCustomZoomButton>
          <ToolButton variant="icon" onClick={app.zoomOut}>
            <MinusIcon />
          </ToolButton>
          <ZoomMenu />
          <ToolButton variant="icon" onClick={app.zoomIn}>
            <PlusIcon />
          </ToolButton>
        </StyledCustomZoomButton>
      )}
    </StyledToolsHelpPanel>
  )
})

const StyledToolsHelpPanel = styled('div', {
  position: 'absolute',
  right: 30,
  bottom: 30,
  zIndex: 999,
  gap: 8,
  display: 'flex',
})

const StyledActionButton = styled('div', {
  padding: 0,
  gap: 8,
  background: '$panelContrast',
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
  borderRadius: 6,

  button: {
    height: 36,
    width: 36,
  },
})

const StyledCustomZoomButton = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 0,
  gap: 8,
  background: '$panelContrast',
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
  borderRadius: 6,

  button: {
    height: 36,
    width: 36,
  },
})
