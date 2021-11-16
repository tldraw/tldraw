import * as React from 'react'
import {
  ArrowTopRightIcon,
  CursorArrowIcon,
  Pencil1Icon,
  Pencil2Icon,
  TextIcon,
} from '@radix-ui/react-icons'
import { TldrawSnapshot, TldrawShapeType } from '~types'
import { useTldrawApp } from '~hooks'
import { ToolButtonWithTooltip } from '~components/ToolButton'
import { Panel } from '~components/Panel'
import { ShapesMenu } from './ShapesMenu'
import { EraserIcon } from '~components/icons'

const activeToolSelector = (s: TldrawSnapshot) => s.appState.activeTool

export const PrimaryTools = React.memo(function PrimaryTools(): JSX.Element {
  const app = useTldrawApp()

  const activeTool = app.useStore(activeToolSelector)

  const selectSelectTool = React.useCallback(() => {
    state.selectTool('select')
  }, [app])

  const selectEraseTool = React.useCallback(() => {
    state.selectTool('erase')
  }, [app])

  const selectDrawTool = React.useCallback(() => {
    state.selectTool(TldrawShapeType.Draw)
  }, [app])

  const selectRectangleTool = React.useCallback(() => {
    state.selectTool(TldrawShapeType.Rectangle)
  }, [app])

  const selectEllipseTool = React.useCallback(() => {
    state.selectTool(TldrawShapeType.Ellipse)
  }, [app])

  const selectArrowTool = React.useCallback(() => {
    state.selectTool(TldrawShapeType.Arrow)
  }, [app])

  const selectTextTool = React.useCallback(() => {
    state.selectTool(TldrawShapeType.Text)
  }, [app])

  const selectStickyTool = React.useCallback(() => {
    state.selectTool(TldrawShapeType.Sticky)
  }, [app])

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
        label={TldrawShapeType.Draw}
        onClick={selectDrawTool}
        isActive={activeTool === TldrawShapeType.Draw}
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
        label={TldrawShapeType.Arrow}
        onClick={selectArrowTool}
        isActive={activeTool === TldrawShapeType.Arrow}
      >
        <ArrowTopRightIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'7'}
        label={TldrawShapeType.Text}
        onClick={selectTextTool}
        isActive={activeTool === TldrawShapeType.Text}
      >
        <TextIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'8'}
        label={TldrawShapeType.Sticky}
        onClick={selectStickyTool}
        isActive={activeTool === TldrawShapeType.Sticky}
      >
        <Pencil2Icon />
      </ToolButtonWithTooltip>
    </Panel>
  )
})
