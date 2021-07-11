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
import { PrimaryButton, SecondaryButton } from './shared'
import { FloatingContainer } from '../shared'
import React from 'react'
import state, { useSelector } from 'state'
import styled from 'styles'
import { ShapeType } from 'types'
import UndoRedo from './undo-redo'
import Zoom from './zoom'
import BackToContent from './back-to-content'

const selectArrowTool = () => state.send('SELECTED_ARROW_TOOL')
const selectDrawTool = () => state.send('SELECTED_DRAW_TOOL')
const selectEllipseTool = () => state.send('SELECTED_ELLIPSE_TOOL')
const selectTextTool = () => state.send('SELECTED_TEXT_TOOL')
const selectRectangleTool = () => state.send('SELECTED_RECTANGLE_TOOL')
const selectSelectTool = () => state.send('SELECTED_SELECT_TOOL')
const toggleToolLock = () => state.send('TOGGLED_TOOL_LOCK')

export default function ToolsPanel(): JSX.Element {
  const activeTool = useSelector((s) => s.data.activeTool)

  const isToolLocked = useSelector((s) => s.data.settings.isToolLocked)

  return (
    <ToolsPanelContainer>
      <LeftWrap size={{ '@initial': 'mobile', '@sm': 'small' }}>
        <Zoom />
        <FloatingContainer>
          <SecondaryButton
            label={'Select'}
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
          <PrimaryButton
            label={ShapeType.Draw}
            onClick={selectDrawTool}
            isActive={activeTool === ShapeType.Draw}
          >
            <Pencil1Icon />
          </PrimaryButton>
          <PrimaryButton
            label={ShapeType.Rectangle}
            onClick={selectRectangleTool}
            isActive={activeTool === ShapeType.Rectangle}
          >
            <SquareIcon />
          </PrimaryButton>
          <PrimaryButton
            label={ShapeType.Ellipse}
            onClick={selectEllipseTool}
            isActive={activeTool === ShapeType.Ellipse}
          >
            <CircleIcon />
          </PrimaryButton>
          <PrimaryButton
            label={ShapeType.Arrow}
            onClick={selectArrowTool}
            isActive={activeTool === ShapeType.Arrow}
          >
            <ArrowTopRightIcon />
          </PrimaryButton>
          <PrimaryButton
            label={ShapeType.Text}
            onClick={selectTextTool}
            isActive={activeTool === ShapeType.Text}
          >
            <TextIcon />
          </PrimaryButton>
        </FloatingContainer>
      </CenterWrap>
      <RightWrap size={{ '@initial': 'mobile', '@sm': 'small' }}>
        <FloatingContainer>
          <SecondaryButton
            label={'Lock Tool'}
            onClick={toggleToolLock}
            isActive={isToolLocked}
          >
            {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
          </SecondaryButton>
        </FloatingContainer>
        <UndoRedo />
      </RightWrap>
    </ToolsPanelContainer>
  )
}

const ToolsPanelContainer = styled('div', {
  position: 'fixed',
  bottom: 44,
  left: 0,
  right: 0,
  width: '100%',
  minWidth: 0,
  maxWidth: '100%',
  display: 'grid',
  gridTemplateColumns: '1fr auto 1fr',
  padding: '0 8px 12px 8px',
  alignItems: 'flex-end',
  zIndex: 200,
  gap: 12,
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
