import * as React from 'react'
import { styled } from '~styles'
import type { Data } from '~types'
import { useTLDrawContext } from '~hooks'
import { StatusBar } from './StatusBar'
import { BackToContent } from './BackToContent'
import { PrimaryTools } from './PrimaryTools'
import { ActionButton } from './ActionButton'
import { LockButton } from './LockButton'

const isDebugModeSelector = (s: Data) => s.settings.isDebugMode

export const ToolsPanel = React.memo((): JSX.Element => {
  const { useSelector } = useTLDrawContext()

  const isDebugMode = useSelector(isDebugModeSelector)

  return (
    <StyledToolsPanelContainer>
      <StyledCenterWrap>
        <BackToContent />
        <StyledPrimaryTools>
          <ActionButton />
          <PrimaryTools />
          <LockButton />
        </StyledPrimaryTools>
      </StyledCenterWrap>
      {isDebugMode && (
        <StyledStatusWrap>
          <StatusBar />
        </StyledStatusWrap>
      )}
    </StyledToolsPanelContainer>
  )
})

const StyledToolsPanelContainer = styled('div', {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  display: 'grid',
  gridTemplateColumns: 'auto auto auto',
  gridTemplateRows: 'auto auto',
  justifyContent: 'space-between',
  padding: '0',
  zIndex: 200,
  pointerEvents: 'none',
  '& > div > *': {
    pointerEvents: 'all',
  },
})

const StyledCenterWrap = styled('div', {
  gridRow: 1,
  gridColumn: 2,
  display: 'flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: '$4',
})

const StyledStatusWrap = styled('div', {
  gridRow: 2,
  gridColumn: '1 / span 3',
})

const StyledPrimaryTools = styled('div', {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
  gap: '$2',
})
