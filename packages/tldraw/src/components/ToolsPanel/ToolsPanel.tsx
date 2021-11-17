import * as React from 'react'
import { styled } from '~styles'
import type { TDSnapshot } from '~types'
import { useTldrawApp } from '~hooks'
import { StatusBar } from './StatusBar'
import { BackToContent } from './BackToContent'
import { PrimaryTools } from './PrimaryTools'
import { ActionButton } from './ActionButton'
import { DeleteButton } from './DeleteButton'
import { Guide } from '~components/Guide'
import { GuideButton } from './GuideButton'

const isDebugModeSelector = (s: TDSnapshot) => s.settings.isDebugMode

export const ToolsPanel = React.memo(function ToolsPanel(): JSX.Element {
  const app = useTldrawApp()

  const isDebugMode = app.useStore(isDebugModeSelector)

  return (
    <StyledToolsPanelContainer>
      <StyledCenterWrap>
        <BackToContent />
        <StyledMainButtons>
          <LeftContent>
            <ActionButton />
          </LeftContent>
          <PrimaryTools />
          <RightContent>
            <DeleteButton />
            <GuideButton />
          </RightContent>
        </StyledMainButtons>
      </StyledCenterWrap>
      {isDebugMode && (
        <StyledStatusWrap>
          <StatusBar />
        </StyledStatusWrap>
      )}
    </StyledToolsPanelContainer>
  )
})

const Spacer = styled('div', { flexGrow: 2 })

const StyledToolsPanelContainer = styled('div', {
  position: 'absolute',
  bottom: 0,
  left: 0,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  alignItems: 'center',
  zIndex: 200,
  pointerEvents: 'none',
  '& > div > *': {
    pointerEvents: 'all',
  },
})

const StyledCenterWrap = styled('div', {
  display: 'flex',
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: '$4',
  paddingBottom: '$4',
})

const StyledStatusWrap = styled('div', {
  width: '100%',
})

const StyledMainButtons = styled('div', {
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  justifyContent: 'center',
  alignItems: 'flex-end',
  width: '100%',
  gap: '$2',
})

const LeftContent = styled('div', {
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  paddingBottom: '$2',
})

const RightContent = styled('div', {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  flexWrap: 'wrap-reverse',
  paddingBottom: '$2',
})
