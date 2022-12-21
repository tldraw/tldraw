import React from 'react'
import { ToolButton } from '~components/Primitives/ToolButton'
import { MinusIcon, PlusIcon } from '~components/Primitives/icons/icoCommon'
import { StyleMenu } from '~components/TopPanel/StyleMenu'
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
      <StyleLine />
      <StyledActionButton>
        <StyleMenu />
      </StyledActionButton>
    </StyledToolsHelpPanel>
  )
})

const StyledToolsHelpPanel = styled('div', {
  position: 'absolute',
  right: 30,
  bottom: 30,
  zIndex: 999,
  gap: 8,
  padding: '$2',
  display: 'flex',
  background: '$panelContrast',
  boxShadow: '0px 0px 10px rgba(0, 0, 0, 0.1)',
  borderRadius: 6,
  alignItems: 'center',
})

const StyleLine = styled('div', {
  display: 'flex',
  backgroundColor: '#ddd',
  width: 1,
  height: 28,
})

const StyledActionButton = styled('div', {
  padding: 0,
  gap: 8,

  '> button': {
    height: 28,
  },
})

const StyledCustomZoomButton = styled('div', {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  padding: 0,
  gap: '$2',

  button: {
    height: 28,
    width: 28,
  },
})
