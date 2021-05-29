import {
  CircleIcon,
  CursorArrowIcon,
  DividerHorizontalIcon,
  DotIcon,
  LineHeightIcon,
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

const selectSelectTool = () => state.send('SELECTED_SELECT_TOOL')
const selectDrawTool = () => state.send('SELECTED_DRAW_TOOL')
const selectDotTool = () => state.send('SELECTED_DOT_TOOL')
const selectCircleTool = () => state.send('SELECTED_CIRCLE_TOOL')
const selectEllipseTool = () => state.send('SELECTED_ELLIPSE_TOOL')
const selectRayTool = () => state.send('SELECTED_RAY_TOOL')
const selectLineTool = () => state.send('SELECTED_LINE_TOOL')
const selectPolylineTool = () => state.send('SELECTED_POLYLINE_TOOL')
const selectRectangleTool = () => state.send('SELECTED_RECTANGLE_TOOL')
const selectToolLock = () => state.send('TOGGLED_TOOL_LOCK')

export default function ToolsPanel() {
  const activeTool = useSelector((state) =>
    state.whenIn({
      selecting: 'select',
      dot: ShapeType.Dot,
      circle: ShapeType.Circle,
      ellipse: ShapeType.Ellipse,
      ray: ShapeType.Ray,
      line: ShapeType.Line,
      polyline: ShapeType.Polyline,
      rectangle: ShapeType.Rectangle,
      draw: ShapeType.Draw,
    })
  )

  const isToolLocked = useSelector((s) => s.data.settings.isToolLocked)

  const isPenLocked = useSelector((s) => s.data.settings.isPenLocked)

  return (
    <OuterContainer>
      <Zoom />
      <Container>
        <IconButton
          name="select"
          size="large"
          onClick={selectSelectTool}
          isActive={activeTool === 'select'}
        >
          <CursorArrowIcon />
        </IconButton>
      </Container>
      <Container>
        <IconButton
          name={ShapeType.Draw}
          size="large"
          onClick={selectDrawTool}
          isActive={activeTool === ShapeType.Draw}
        >
          <Pencil1Icon />
        </IconButton>
        <IconButton
          name={ShapeType.Rectangle}
          size="large"
          onClick={selectRectangleTool}
          isActive={activeTool === ShapeType.Rectangle}
        >
          <SquareIcon />
        </IconButton>
        <IconButton
          name={ShapeType.Circle}
          size="large"
          onClick={selectCircleTool}
          isActive={activeTool === ShapeType.Circle}
        >
          <CircleIcon />
        </IconButton>
        <IconButton
          name={ShapeType.Ellipse}
          size="large"
          onClick={selectEllipseTool}
          isActive={activeTool === ShapeType.Ellipse}
        >
          <CircleIcon transform="rotate(-45) scale(1, .8)" />
        </IconButton>
        <IconButton
          name={ShapeType.Line}
          size="large"
          onClick={selectLineTool}
          isActive={activeTool === ShapeType.Line}
        >
          <DividerHorizontalIcon transform="rotate(-45)" />
        </IconButton>
        <IconButton
          name={ShapeType.Ray}
          size="large"
          onClick={selectRayTool}
          isActive={activeTool === ShapeType.Ray}
        >
          <SewingPinIcon transform="rotate(-135)" />
        </IconButton>
        <IconButton
          name={ShapeType.Dot}
          size="large"
          onClick={selectDotTool}
          isActive={activeTool === ShapeType.Dot}
        >
          <DotIcon />
        </IconButton>
      </Container>
      <Container>
        <IconButton size="medium" onClick={selectToolLock}>
          {isToolLocked ? <LockClosedIcon /> : <LockOpen1Icon />}
        </IconButton>
        {isPenLocked && (
          <IconButton size="medium" onClick={selectToolLock}>
            <Pencil2Icon />
          </IconButton>
        )}
      </Container>
      <UndoRedo />
    </OuterContainer>
  )
}

const Spacer = styled('div', { flexGrow: 2 })

const OuterContainer = styled('div', {
  position: 'relative',
  gridArea: 'tools',
  padding: '0 8px 12px 8px',
  height: '100%',
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 16,
})

const Container = styled('div', {
  position: 'relative',
  backgroundColor: '$panel',
  borderRadius: '4px',
  overflow: 'hidden',
  border: '1px solid $border',
  pointerEvents: 'all',
  userSelect: 'none',
  zIndex: 200,
  boxShadow: '0px 2px 25px rgba(0,0,0,.16)',
  height: '100%',
  display: 'flex',
  padding: 4,

  '& svg': {
    strokeWidth: 0,
  },
})
