import * as React from 'react'
import { Drawkit } from '~components/Primitives/icons/icoCommon'
import { styled } from '~styles'
import { Menu } from './Menu/Menu'
import { PageMenu } from './PageMenu'

interface TopPanelProps {
  readOnly: boolean
  showPages: boolean
  showMenu: boolean
}

export function _TopPanel({ readOnly, showPages, showMenu }: TopPanelProps) {
  return (
    <StyledTopPanel>
      <StyledLogo>
        <Drawkit className="logo" />
      </StyledLogo>
      {showPages && <StyledPage>{showPages && <PageMenu />}</StyledPage>}
      {showMenu && <StyledMenu>{showMenu && <Menu readOnly={readOnly} />}</StyledMenu>}
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
  padding: '0 10px 0 28px',
  flexDirection: 'row',
  pointerEvents: 'none',
  background: '$panelContrast',
  borderBottom: '1px solid #ebebeb',

  '& > *': {
    pointerEvents: 'all',
  },
})

const StyledLogo = styled('div', {
  pointerEvents: 'none',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',

  '.logo': {
    height: 20,
  },
})

export const StyledPage = styled('div', {
  backgroundColor: '$panelContrast',
  display: 'flex',
  padding: '$2',
  flexDirection: 'row',
  justifyContent: 'center',
  flexGrow: 2,
})

export const StyledMenu = styled('div', {
  backgroundColor: '$panelContrast',
  display: 'flex',
  padding: '$2',
  flexDirection: 'row',
})

export const TopPanel = React.memo(_TopPanel)
