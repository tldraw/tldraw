import {
  ArrowTopRightIcon,
  CircleIcon,
  CursorArrowIcon,
  DividerHorizontalIcon,
  DotIcon,
  LockClosedIcon,
  LockOpen1Icon,
  Pencil1Icon,
  Pencil2Icon,
  SewingPinIcon,
  SquareIcon,
  TextIcon,
} from '@radix-ui/react-icons'
import { IconButton } from 'components/shared'
import React from 'react'
import state, { useSelector } from 'state'
import styled from 'styles'
import { ShapeType } from 'types'
import UndoRedo from './undo-redo'
import Zoom from './zoom'
import Tooltip from '../tooltip'

const selectArrowTool = () => state.send('SELECTED_ARROW_TOOL')
const selectCircleTool = () => state.send('SELECTED_CIRCLE_TOOL')
const selectDotTool = () => state.send('SELECTED_DOT_TOOL')
const selectDrawTool = () => state.send('SELECTED_DRAW_TOOL')
const selectEllipseTool = () => state.send('SELECTED_ELLIPSE_TOOL')
const selectLineTool = () => state.send('SELECTED_LINE_TOOL')
const selectPolylineTool = () => state.send('SELECTED_POLYLINE_TOOL')
const selectTextTool = () => state.send('SELECTED_TEXT_TOOL')
const selectRayTool = () => state.send('SELECTED_RAY_TOOL')
const selectRectangleTool = () => state.send('SELECTED_RECTANGLE_TOOL')
const selectSelectTool = () => state.send('SELECTED_SELECT_TOOL')
const selectToolLock = () => state.send('TOGGLED_TOOL_LOCK')

export default function ToolsPanel() {
  const activeTool = useSelector((s) => s.data.activeTool)

  const isToolLocked = useSelector((s) => s.data.settings.isToolLocked)

  const isPenLocked = useSelector((s) => s.data.settings.isPenLocked)

  return (
    <OuterContainer>
      <Zoom />
      <Flex size={{ '@sm': 'small' }}>
        <Container>
          <Tooltip label="Select">
            <IconButton
              name="select"
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size={{ '@initial': 'small', '@sm': 'small', '@md': 'medium' }}
              onClick={selectSelectTool}
              isActive={activeTool === 'select'}
            >
              <CursorArrowIcon />
            </IconButton>
          </Tooltip>
        </Container>
        <Container>
          <Tooltip label="Draw">
            <IconButton
              name={ShapeType.Draw}
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
              onClick={selectDrawTool}
              isActive={activeTool === ShapeType.Draw}
            >
              <Pencil1Icon />
            </IconButton>
          </Tooltip>
          <Tooltip label="Rectangle">
            <IconButton
              name={ShapeType.Rectangle}
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
              onClick={selectRectangleTool}
              isActive={activeTool === ShapeType.Rectangle}
            >
              <SquareIcon />
            </IconButton>
          </Tooltip>
          <Tooltip label="Ellipse">
            <IconButton
              name={ShapeType.Circle}
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
              onClick={selectEllipseTool}
              isActive={activeTool === ShapeType.Ellipse}
            >
              <CircleIcon />
            </IconButton>
          </Tooltip>
          <Tooltip label="Arrow">
            <IconButton
              name={ShapeType.Arrow}
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
              onClick={selectArrowTool}
              isActive={activeTool === ShapeType.Arrow}
            >
              <ArrowTopRightIcon />
            </IconButton>
          </Tooltip>
          <Tooltip label="Text">
            <IconButton
              name={ShapeType.Text}
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
              onClick={selectTextTool}
              isActive={activeTool === ShapeType.Text}
            >
              <TextIcon />
            </IconButton>
          </Tooltip>
        </Container>
        <Container>
          <Tooltip label="Lock Tool">
            <IconButton
              bp={{ '@initial': 'mobile', '@sm': 'small' }}
              size={{ '@initial': 'small', '@sm': 'small', '@md': 'medium' }}
              onClick={selectToolLock}
            >
              {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
            </IconButton>
          </Tooltip>
          {isPenLocked && (
            <Tooltip label="Unlock Pen">
              <IconButton
                bp={{ '@initial': 'mobile', '@sm': 'small' }}
                size={{ '@initial': 'small', '@sm': 'small', '@md': 'medium' }}
                onClick={selectToolLock}
              >
                <Pencil2Icon />
              </IconButton>
            </Tooltip>
          )}
        </Container>
      </Flex>
      <UndoRedo />
    </OuterContainer>
  )
}

const OuterContainer = styled('div', {
  position: 'fixed',
  bottom: 44,
  left: 0,
  right: 0,
  padding: '0 8px 12px 8px',
  width: '100%',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  flexWrap: 'wrap',
  gap: 16,
  zIndex: 200,
})

const Flex = styled('div', {
  display: 'flex',
  width: '100%',
  padding: '0 4px',
  justifyContent: 'space-between',
  alignItems: 'flex-end',

  variants: {
    size: {
      small: {
        width: 'auto',
        padding: '0',
        justifyContent: 'center',
        '& > *:nth-child(n+2)': {
          marginLeft: 16,
        },
      },
    },
  },
})

const Container = styled('div', {
  position: 'relative',
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  border: '1px solid $panel',
  pointerEvents: 'all',
  userSelect: 'none',
  height: '100%',
  display: 'flex',
  padding: 4,
  boxShadow: '0px 2px 4px rgba(0,0,0,.12)',

  '& svg': {
    strokeWidth: 0,
  },
})
