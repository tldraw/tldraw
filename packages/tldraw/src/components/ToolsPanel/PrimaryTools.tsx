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
import { Data, TLDrawShapeType } from '~types'
import { useTLDrawContext } from '~hooks'
import { ToolButtonWithTooltip } from '~components/ToolButton'
import { Panel } from '~components/Panel'

const activeToolSelector = (s: Data) => s.appState.activeTool

export const PrimaryTools = React.memo(function PrimaryTools(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()

  const activeTool = useSelector(activeToolSelector)

  const selectSelectTool = React.useCallback(() => {
    tlstate.selectTool('select')
  }, [tlstate])

  const selectDrawTool = React.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Draw)
  }, [tlstate])

  const selectRectangleTool = React.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Rectangle)
  }, [tlstate])

  const selectEllipseTool = React.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Ellipse)
  }, [tlstate])

  const selectArrowTool = React.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Arrow)
  }, [tlstate])

  const selectTextTool = React.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Text)
  }, [tlstate])

  const selectStickyTool = React.useCallback(() => {
    tlstate.selectTool(TLDrawShapeType.Sticky)
  }, [tlstate])

  return (
    <Panel side="center">
      <ToolButtonWithTooltip
        kbd={'2'}
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
        label={TLDrawShapeType.Draw}
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
