import * as React from 'react'
import {
  ArrowTopRightIcon,
  CursorArrowIcon,
  Pencil1Icon,
  Pencil2Icon,
  TextIcon,
} from '@radix-ui/react-icons'
import { TLDrawSnapshot, TLDrawShapeType } from '~types'
import { useTLDrawContext } from '~hooks'
import { ToolButtonWithTooltip } from '~components/ToolButton'
import { Panel } from '~components/Panel'
import { ShapesMenu } from './ShapesMenu'
import { EraserIcon } from '~components/icons'

const activeToolSelector = (s: TLDrawSnapshot) => s.appState.activeTool

export const PrimaryTools = React.memo(function PrimaryTools(): JSX.Element {
  const { state, useSelector } = useTLDrawContext()

  const activeTool = useSelector(activeToolSelector)

  const selectSelectTool = React.useCallback(() => {
    state.selectTool('select')
  }, [state])

  const selectEraseTool = React.useCallback(() => {
    state.selectTool('erase')
  }, [state])

  const selectDrawTool = React.useCallback(() => {
    state.selectTool(TLDrawShapeType.Draw)
  }, [state])

  const selectRectangleTool = React.useCallback(() => {
    state.selectTool(TLDrawShapeType.Rectangle)
  }, [state])

  const selectEllipseTool = React.useCallback(() => {
    state.selectTool(TLDrawShapeType.Ellipse)
  }, [state])

  const selectArrowTool = React.useCallback(() => {
    state.selectTool(TLDrawShapeType.Arrow)
  }, [state])

  const selectTextTool = React.useCallback(() => {
    state.selectTool(TLDrawShapeType.Text)
  }, [state])

  const selectStickyTool = React.useCallback(() => {
    state.selectTool(TLDrawShapeType.Sticky)
  }, [state])

  return (
    <Panel side="center">
      <ToolButtonWithTooltip
        kbd={'1'}
        label={'select'}
        onClick={selectSelectTool}
        isActive={activeTool === 'select'}
      >
        <CursorArrowIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'2'}
        label={TLDrawShapeType.Draw}
        onClick={selectDrawTool}
        isActive={activeTool === TLDrawShapeType.Draw}
      >
        <Pencil1Icon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'3'}
        label={'eraser'}
        onClick={selectEraseTool}
        isActive={activeTool === 'erase'}
      >
        <EraserIcon />
      </ToolButtonWithTooltip>
      <ShapesMenu activeTool={activeTool} />
      <ToolButtonWithTooltip
        kbd={'6'}
        label={TLDrawShapeType.Arrow}
        onClick={selectArrowTool}
        isActive={activeTool === TLDrawShapeType.Arrow}
      >
        <ArrowTopRightIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'7'}
        label={TLDrawShapeType.Text}
        onClick={selectTextTool}
        isActive={activeTool === TLDrawShapeType.Text}
      >
        <TextIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'8'}
        label={TLDrawShapeType.Sticky}
        onClick={selectStickyTool}
        isActive={activeTool === TLDrawShapeType.Sticky}
      >
        <Pencil2Icon />
      </ToolButtonWithTooltip>
    </Panel>
  )
})
