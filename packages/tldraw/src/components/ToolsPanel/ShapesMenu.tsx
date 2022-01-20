import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Panel } from '~components/Primitives/Panel'
import { ToolButton } from '~components/Primitives/ToolButton'
import { TDShapeType, TDSnapshot, TDToolType } from '~types'
import { useTldrawApp } from '~hooks'
import { SquareIcon, CircleIcon, VercelLogoIcon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Primitives/Tooltip'
import { LineIcon } from '~components/Primitives/icons'

interface ShapesMenuProps {
  activeTool: TDToolType
  isToolLocked: boolean
}

type ShapeShape =
  | TDShapeType.Rectangle
  | TDShapeType.Ellipse
  | TDShapeType.Triangle
  | TDShapeType.Line

const shapeShapes: ShapeShape[] = [
  TDShapeType.Rectangle,
  TDShapeType.Ellipse,
  TDShapeType.Triangle,
  TDShapeType.Line,
]

const shapeShapeIcons = {
  [TDShapeType.Rectangle]: <SquareIcon />,
  [TDShapeType.Ellipse]: <CircleIcon />,
  [TDShapeType.Triangle]: <VercelLogoIcon />,
  [TDShapeType.Line]: <LineIcon />,
}

const statusSelector = (s: TDSnapshot) => s.appState.status

enum Status {
  SpacePanning = 'spacePanning',
}

export const ShapesMenu = React.memo(function ShapesMenu({
  activeTool,
  isToolLocked,
}: ShapesMenuProps) {
  const app = useTldrawApp()

  const status = app.useStore(statusSelector)

  const [lastActiveTool, setLastActiveTool] = React.useState<ShapeShape>(TDShapeType.Rectangle)

  React.useEffect(() => {
    if (shapeShapes.includes(activeTool as ShapeShape) && lastActiveTool !== activeTool) {
      setLastActiveTool(activeTool as ShapeShape)
    }
  }, [activeTool])

  const selectShapeTool = React.useCallback(() => {
    app.selectTool(lastActiveTool)
  }, [activeTool, app])

  const handleDoubleClick = React.useCallback(() => {
    app.toggleToolLock()
  }, [app])

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === ' ') {
      if (app.shiftKey) {
        e.preventDefault()
      }
    }
  }, [])

  const isActive = shapeShapes.includes(activeTool as ShapeShape)

  return (
    <DropdownMenu.Root dir="ltr" onOpenChange={selectShapeTool}>
      <DropdownMenu.Trigger dir="ltr" asChild id="TD-PrimaryTools-Shapes">
        <ToolButton
          disabled={isActive && app.shiftKey} // otherwise this continuously opens and closes on "SpacePanning"
          variant="primary"
          onDoubleClick={handleDoubleClick}
          isToolLocked={isActive && isToolLocked}
          isActive={isActive}
          onKeyDown={handleKeyDown}
        >
          {shapeShapeIcons[lastActiveTool]}
        </ToolButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content asChild dir="ltr" side="top" sideOffset={12}>
        <Panel side="center">
          {shapeShapes.map((shape, i) => (
            <Tooltip
              key={shape}
              label={shape[0].toUpperCase() + shape.slice(1)}
              kbd={(4 + i).toString()}
              id={`TD-PrimaryTools-Shapes-${shape}`}
            >
              <DropdownMenu.Item asChild>
                <ToolButton
                  variant="primary"
                  onClick={() => {
                    app.selectTool(shape)
                    setLastActiveTool(shape)
                  }}
                >
                  {shapeShapeIcons[shape]}
                </ToolButton>
              </DropdownMenu.Item>
            </Tooltip>
          ))}
        </Panel>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
})
