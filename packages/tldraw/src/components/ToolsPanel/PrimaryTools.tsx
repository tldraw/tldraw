import * as React from 'react'
import {
  ArrowTopRightIcon,
  CircleIcon,
  CursorArrowIcon,
  Pencil1Icon,
  Pencil2Icon,
  SquareIcon,
  TextIcon,
} from '@radix-ui/react-icons'
import { TLDrawSnapshot, TLDrawShapeType } from '~types'
import { useTLDrawContext } from '~hooks'
import { ToolButtonWithTooltip } from '~components/ToolButton'
import { Panel } from '~components/Panel'

const activeToolSelector = (s: TLDrawSnapshot) => s.appState.activeTool

export const PrimaryTools = React.memo(function PrimaryTools(): JSX.Element {
  const { state, useSelector } = useTLDrawContext()

  const activeTool = useSelector(activeToolSelector)

  const selectSelectTool = React.useCallback(() => {
    state.selectTool('select')
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
        label={TLDrawShapeType.Rectangle}
        onClick={selectRectangleTool}
        isActive={activeTool === TLDrawShapeType.Rectangle}
      >
        <SquareIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'4'}
        label={TLDrawShapeType.Ellipse}
        onClick={selectEllipseTool}
        isActive={activeTool === TLDrawShapeType.Ellipse}
      >
        <CircleIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'5'}
        label={TLDrawShapeType.Arrow}
        onClick={selectArrowTool}
        isActive={activeTool === TLDrawShapeType.Arrow}
      >
        <ArrowTopRightIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'6'}
        label={TLDrawShapeType.Text}
        onClick={selectTextTool}
        isActive={activeTool === TLDrawShapeType.Text}
      >
        <TextIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'7'}
        label={TLDrawShapeType.Sticky}
        onClick={selectStickyTool}
        isActive={activeTool === TLDrawShapeType.Sticky}
      >
        <Pencil2Icon />
      </ToolButtonWithTooltip>
    </Panel>
  )
})
