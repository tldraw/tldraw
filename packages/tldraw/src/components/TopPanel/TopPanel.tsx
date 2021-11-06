import * as React from 'react'
import { Menu } from './Menu'
import { styled } from '~styles'
import { PageMenu } from './PageMenu'
import { ZoomMenu } from './ZoomMenu'
import { DashMenu } from './DashMenu'
import { SizeMenu } from './SizeMenu'
import { FillCheckbox } from './FillCheckbox'
import { ColorMenu } from './ColorMenu'
import { Panel } from '~components/Panel'

interface TopPanelProps {
  readOnly: boolean
  showPages: boolean
  showMenu: boolean
  showStyles: boolean
  showZoom: boolean
}

export function TopPanel({ readOnly, showPages, showMenu, showStyles, showZoom }: TopPanelProps) {
  return (
    <StyledTopPanel>
      {(showMenu || showPages) && (
        <Panel side="left">
          {showMenu && <Menu readOnly={readOnly} />}
          {showPages && <PageMenu />}
        </Panel>
      )}
      <StyledSpacer />
      {(showStyles || showZoom) && (
        <Panel side="right">
          {showStyles && !readOnly && (
            <>
              <ColorMenu />
              <SizeMenu />
              <DashMenu />
              <FillCheckbox />
            </>
          )}
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
})

const StyledSpacer = styled('div', {
  flexGrow: 2,
})
