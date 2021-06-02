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
} from '@radix-ui/react-icons'
import { IconButton } from 'components/shared'
import React from 'react'
import state, { useSelector } from 'state'
import styled from 'styles'
import { ShapeType } from 'types'
import UndoRedo from './undo-redo'
import Zoom from './zoom'

const selectArrowTool = () => state.send('SELECTED_ARROW_TOOL')
const selectCircleTool = () => state.send('SELECTED_CIRCLE_TOOL')
const selectDotTool = () => state.send('SELECTED_DOT_TOOL')
const selectDrawTool = () => state.send('SELECTED_DRAW_TOOL')
const selectEllipseTool = () => state.send('SELECTED_ELLIPSE_TOOL')
const selectLineTool = () => state.send('SELECTED_LINE_TOOL')
const selectPolylineTool = () => state.send('SELECTED_POLYLINE_TOOL')
const selectRayTool = () => state.send('SELECTED_RAY_TOOL')
const selectRectangleTool = () => state.send('SELECTED_RECTANGLE_TOOL')
const selectSelectTool = () => state.send('SELECTED_SELECT_TOOL')
const selectToolLock = () => state.send('TOGGLED_TOOL_LOCK')

export default function ToolsPanel() {
  const activeTool = useSelector((state) =>
    state.whenIn({
      arrow: ShapeType.Arrow,
      circle: ShapeType.Circle,
      dot: ShapeType.Dot,
      draw: ShapeType.Draw,
      ellipse: ShapeType.Ellipse,
      line: ShapeType.Line,
      polyline: ShapeType.Polyline,
      ray: ShapeType.Ray,
      rectangle: ShapeType.Rectangle,
      selecting: 'select',
    })
  )

  const isToolLocked = useSelector((s) => s.data.settings.isToolLocked)

  const isPenLocked = useSelector((s) => s.data.settings.isPenLocked)

  return (
    <OuterContainer>
      <Zoom />
      <Flex size={{ '@sm': 'small' }}>
        <Container>
          <IconButton
            name="select"
            size={{ '@initial': 'small', '@sm': 'small', '@md': 'large' }}
            onClick={selectSelectTool}
            isActive={activeTool === 'select'}
          >
            <CursorArrowIcon />
          </IconButton>
        </Container>
        <Container>
          <IconButton
            name={ShapeType.Draw}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectDrawTool}
            isActive={activeTool === ShapeType.Draw}
          >
            <Pencil1Icon />
          </IconButton>
          <IconButton
            name={ShapeType.Rectangle}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectRectangleTool}
            isActive={activeTool === ShapeType.Rectangle}
          >
            <SquareIcon />
          </IconButton>
          <IconButton
            name={ShapeType.Circle}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectEllipseTool}
            isActive={activeTool === ShapeType.Ellipse}
          >
            <CircleIcon />
          </IconButton>
          <IconButton
            name={ShapeType.Arrow}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectArrowTool}
            isActive={activeTool === ShapeType.Arrow}
          >
            <ArrowTopRightIcon />
          </IconButton>
          {/* <IconButton
            name={ShapeType.Circle}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectCircleTool}
            isActive={activeTool === ShapeType.Circle}
          >
            <CircleIcon />
          </IconButton> */}
          {/* <IconButton
            name={ShapeType.Line}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectLineTool}
            isActive={activeTool === ShapeType.Line}
          >
            <DividerHorizontalIcon transform="rotate(-45)" />
          </IconButton>
          <IconButton
            name={ShapeType.Ray}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectRayTool}
            isActive={activeTool === ShapeType.Ray}
          >
            <SewingPinIcon transform="rotate(-135)" />
          </IconButton>
          <IconButton
            name={ShapeType.Dot}
            size={{ '@initial': 'medium', '@sm': 'small', '@md': 'large' }}
            onClick={selectDotTool}
            isActive={activeTool === ShapeType.Dot}
          >
            <DotIcon />
          </IconButton> */}
        </Container>
        <Container>
          <IconButton
            size={{ '@initial': 'small', '@sm': 'small', '@md': 'large' }}
            onClick={selectToolLock}
          >
            {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
          </IconButton>
          {isPenLocked && (
            <IconButton
              size={{ '@initial': 'small', '@sm': 'small', '@md': 'large' }}
              onClick={selectToolLock}
            >
              <Pencil2Icon />
            </IconButton>
          )}
        </Container>
      </Flex>
      <UndoRedo />
    </OuterContainer>
  )
}

const OuterContainer = styled('div', {
  position: 'fixed',
  bottom: 40,
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
