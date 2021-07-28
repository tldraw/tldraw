import {
  ArrowTopRightIcon,
  CircleIcon,
  CursorArrowIcon,
  LockClosedIcon,
  LockOpen1Icon,
  Pencil1Icon,
  SquareIcon,
  TextIcon,
} from '@radix-ui/react-icons'
import * as React from 'react'
import { state, useSelector } from '../../state'
import { StatusBar } from '../status-bar'
import { FloatingContainer } from '../shared'
import { PrimaryButton, SecondaryButton } from './shared'
import styled from '../../styles'
import { UndoRedo } from './undo-redo'
import { Zoom } from './zoom'
import { BackToContent } from './back-to-content'
import { TLDrawShapeType } from '../../shape'

const selectSelectTool = () => state.send('SELECTED_TOOL', { type: 'select' })
const selectDrawTool = () => state.send('SELECTED_TOOL', { type: TLDrawShapeType.Ellipse })
const selectRectangleTool = () => state.send('SELECTED_TOOL', { type: TLDrawShapeType.Rectangle })
const selectEllipseTool = () => state.send('SELECTED_TOOL', { type: TLDrawShapeType.Ellipse })
const selectArrowTool = () => state.send('SELECTED_TOOL', { type: TLDrawShapeType.Ellipse })
const selectTextTool = () => state.send('SELECTED_TOOL', { type: TLDrawShapeType.Ellipse })
const toggleToolLock = () => state.send('TOGGLED_TOOL_LOCK')

export const ToolsPanel = React.memo((): JSX.Element => {
  const activeTool = useSelector((s) => s.data.appState.activeTool)
  const isToolLocked = useSelector((s) => s.data.appState.isToolLocked)
  const isDebugMode = useSelector((s) => s.data.settings.isDebugMode)

  return (
    <ToolsPanelContainer>
      <LeftWrap size={{ '@initial': 'mobile', '@sm': 'small' }}>
        <Zoom />
        <FloatingContainer>
          <SecondaryButton
            label={'Select'}
            kbd={'1'}
            onClick={selectSelectTool}
            isActive={activeTool === 'select'}
          >
            <CursorArrowIcon />
          </SecondaryButton>
        </FloatingContainer>
      </LeftWrap>
      <CenterWrap>
        <BackToContent />
        <FloatingContainer>
          {/* <PrimaryButton
            kbd={'2'}
            label={TLDrawShapeType.Draw}
            onClick={selectDrawTool}
            isActive={activeTool === TLDrawTLDrawShapeType.Draw}
          >
            <Pencil1Icon />
          </PrimaryButton> */}
          <PrimaryButton
            kbd={'3'}
            label={TLDrawShapeType.Rectangle}
            onClick={selectRectangleTool}
            isActive={activeTool === TLDrawShapeType.Rectangle}
          >
            <SquareIcon />
          </PrimaryButton>
          <PrimaryButton
            kbd={'4'}
            label={TLDrawShapeType.Ellipse}
            onClick={selectEllipseTool}
            isActive={activeTool === TLDrawShapeType.Ellipse}
          >
            <CircleIcon />
          </PrimaryButton>
          {/* <PrimaryButton
            kbd={'5'}
            label={TLDrawShapeType.Arrow}
            onClick={selectArrowTool}
            isActive={activeTool === TLDrawTLDrawShapeType.Arrow}
          >
            <ArrowTopRightIcon />
          </PrimaryButton>
          <PrimaryButton
            kbd={'6'}
            label={TLDrawShapeType.Text}
            onClick={selectTextTool}
            isActive={activeTool === TLDrawTLDrawShapeType.Text}
          >
            <TextIcon />
          </PrimaryButton> */}
        </FloatingContainer>
      </CenterWrap>
      <RightWrap size={{ '@initial': 'mobile', '@sm': 'small' }}>
        <FloatingContainer>
          <SecondaryButton
            kbd={'7'}
            label={'Lock Tool'}
            onClick={toggleToolLock}
            isActive={isToolLocked}
          >
            {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
          </SecondaryButton>
        </FloatingContainer>
        <UndoRedo />
      </RightWrap>
      <StatusWrap>{isDebugMode && <StatusBar />}</StatusWrap>
    </ToolsPanelContainer>
  )
})

const ToolsPanelContainer = styled('div', {
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  padding: '0',
  alignItems: 'flex-end',
  zIndex: 200,
  gridGap: '$4',
  gridRowGap: '$4',
})

const CenterWrap = styled('div', {
  gridRow: 1,
  gridColumn: 2,
  display: 'flex',
  width: 'fit-content',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  gap: 12,
})

const LeftWrap = styled('div', {
  gridRow: 1,
  gridColumn: 1,
  display: 'flex',
  paddingLeft: '$3',
  variants: {
    size: {
      mobile: {
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        '& > *:nth-of-type(1)': {
          marginBottom: '8px',
        },
      },
      small: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        '& > *:nth-of-type(1)': {
          marginBottom: '0px',
        },
      },
    },
  },
})

const RightWrap = styled('div', {
  gridRow: 1,
  gridColumn: 3,
  display: 'flex',
  paddingRight: '$3',
  variants: {
    size: {
      mobile: {
        flexDirection: 'column-reverse',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        '& > *:nth-of-type(2)': {
          marginBottom: '8px',
        },
      },
      small: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        '& > *:nth-of-type(2)': {
          marginBottom: '0px',
        },
      },
    },
  },
})

const StatusWrap = styled('div', {
  gridRow: 2,
  gridColumn: '1 / span 3',
})
