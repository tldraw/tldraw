import * as React from 'react'
import { useIntl } from 'react-intl'
import { ToolPanel } from '~components/Primitives/Panel'
import { ToolButtonWithTooltip } from '~components/Primitives/ToolButton'
import {
  ArrowDrawIcon,
  Eraser2Icon,
  HighlightIcon,
  ImageIcon,
  PencilIcon,
  SelectedIcon,
  StickyIcon,
  TextIcon,
} from '~components/Primitives/icons'
import { useTldrawApp } from '~hooks'
import { TDShapeType, TDSnapshot } from '~types'
import { ShapesMenu } from './ShapesMenu'

const activeToolSelector = (s: TDSnapshot) => s.appState.activeTool
const toolLockedSelector = (s: TDSnapshot) => s.appState.isToolLocked
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

export const PrimaryTools = React.memo(function PrimaryTools() {
  const app = useTldrawApp()
  const intl = useIntl()

  const activeTool = app.useStore(activeToolSelector)

  const isToolLocked = app.useStore(toolLockedSelector)
  const dockPosition = app.useStore(dockPositionState)

  const selectSelectTool = React.useCallback(() => {
    app.selectTool('select')
  }, [app])

  const selectEraseTool = React.useCallback(() => {
    app.selectTool('erase')
  }, [app])

  const selectHighlightTool = React.useCallback(() => {
    app.selectTool(TDShapeType.Highlight)
  }, [app])

  const selectDrawTool = React.useCallback(() => {
    app.selectTool(TDShapeType.Draw)
  }, [app])

  const selectArrowTool = React.useCallback(() => {
    app.selectTool(TDShapeType.Arrow)
  }, [app])

  const selectTextTool = React.useCallback(() => {
    app.selectTool(TDShapeType.Text)
  }, [app])

  const selectTableTool = React.useCallback(() => {
    app.selectTool(TDShapeType.Table)
  }, [app])

  const selectStickyTool = React.useCallback(() => {
    app.selectTool(TDShapeType.Sticky)
  }, [app])

  const selectTemplateTool = React.useCallback(() => {
    app.selectTool(TDShapeType.Template)
  }, [app])

  const uploadMedias = React.useCallback(async () => {
    app.openAsset()
  }, [app])

  const panelStyle = dockPosition === 'bottom' || dockPosition === 'top' ? 'row' : 'column'

  return (
    <ToolPanel id="TD-PrimaryTools" panelStyle={panelStyle}>
      <ToolButtonWithTooltip
        kbd={'1'}
        label={intl.formatMessage({ id: 'select' })}
        onClick={selectSelectTool}
        isActive={activeTool === 'select'}
        id="TD-PrimaryTools-CursorArrow"
      >
        <SelectedIcon />
      </ToolButtonWithTooltip>
      {/* <ToolButtonWithTooltip
        kbd={'^t'}
        label={intl.formatMessage({ id: 'table' })}
        onClick={selectTableTool}
        isLocked={isToolLocked}
        isActive={activeTool === TDShapeType.Table}
        id="TD-PrimaryTools-Table"
      >
        <TableIcon />
      </ToolButtonWithTooltip> */}
      <ToolButtonWithTooltip
        kbd={'2'}
        label={intl.formatMessage({ id: 'draw' })}
        onClick={selectDrawTool}
        isActive={activeTool === TDShapeType.Draw}
        id="TD-PrimaryTools-Pencil"
      >
        <PencilIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'h'}
        label={intl.formatMessage({ id: 'highlight' })}
        onClick={selectHighlightTool}
        isActive={activeTool === TDShapeType.Highlight}
        id="TD-PrimaryTools-Highlight"
      >
        <HighlightIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'3'}
        label={intl.formatMessage({ id: 'eraser' })}
        onClick={selectEraseTool}
        isActive={activeTool === 'erase'}
        id="TD-PrimaryTools-Eraser"
      >
        <Eraser2Icon />
      </ToolButtonWithTooltip>
      <ShapesMenu activeTool={activeTool} isToolLocked={isToolLocked} />
      <ToolButtonWithTooltip
        kbd={'8'}
        label={intl.formatMessage({ id: 'arrow' })}
        onClick={selectArrowTool}
        isLocked={isToolLocked}
        isActive={activeTool === TDShapeType.Arrow}
        id="TD-PrimaryTools-ArrowTopRight"
      >
        <ArrowDrawIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'9'}
        label={intl.formatMessage({ id: 'text' })}
        onClick={selectTextTool}
        isLocked={isToolLocked}
        isActive={activeTool === TDShapeType.Text}
        id="TD-PrimaryTools-Text"
      >
        <TextIcon />
      </ToolButtonWithTooltip>
      <ToolButtonWithTooltip
        kbd={'0'}
        label={intl.formatMessage({ id: 'sticky' })}
        onClick={selectStickyTool}
        isActive={activeTool === TDShapeType.Sticky}
        id="TD-PrimaryTools-Pencil2"
      >
        <StickyIcon />
      </ToolButtonWithTooltip>
      {/* <ToolButtonWithTooltip
        label={intl.formatMessage({ id: 'template' })}
        onClick={selectTemplateTool}
        isActive={activeTool === TDShapeType.Template}
        id="TD-PrimaryTools-Teamplate"
      >
        <ArchiveIcon />
      </ToolButtonWithTooltip> */}
      <ToolButtonWithTooltip
        label={intl.formatMessage({ id: 'image' })}
        onClick={uploadMedias}
        id="TD-PrimaryTools-Image"
      >
        <ImageIcon />
      </ToolButtonWithTooltip>
    </ToolPanel>
  )
})
