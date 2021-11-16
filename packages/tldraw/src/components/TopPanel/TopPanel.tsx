import * as React from 'react'
import { Menu } from './Menu'
import { styled } from '~styles'
import { PageMenu } from './PageMenu'
import { ZoomMenu } from './ZoomMenu'
import { StyleMenu } from './StyleMenu'
import { Panel } from '~components/Panel'

interface TopPanelProps {
  readOnly: boolean
  showPages: boolean
  showMenu: boolean
  showStyles: boolean
  showZoom: boolean
  showSponsorLink: boolean
}

export function TopPanel({
  readOnly,
  showPages,
  showMenu,
  showStyles,
  showZoom,
  showSponsorLink,
}: TopPanelProps) {
  return (
    <StyledTopPanel>
      {(showMenu || showPages) && (
        <Panel side="left">
          {showMenu && <Menu showSponsorLink={showSponsorLink} readOnly={readOnly} />}
          {showPages && <PageMenu />}
        </Panel>
      )}
      <StyledSpacer />
      {(showStyles || showZoom) && (
        <Panel side="right">
          {showStyles && !readOnly && <StyleMenu />}
          {showZoom && <ZoomMenu />}
        </Panel>
      )}
    </StyledTopPanel>
  )
}

const StyledTopPanel = styled('div', {
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  display: 'flex',
  flexDirection: 'row',
  pointerEvents: 'none',
  '& > *': {
    pointerEvents: 'all',
  },
})

const StyledSpacer = styled('div', {
  flexGrow: 2,
  pointerEvents: 'none',
})
