import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Panel } from '~components/Panel'
import { ToolButton } from '~components/ToolButton'
import { TDShapeType, TDToolType } from '~types'
import { useTldrawApp } from '~hooks'
import { SquareIcon, CircleIcon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Tooltip'

interface ShapesMenuProps {
  activeTool: TDToolType
  isToolLocked: boolean
}

type ShapeShape = TDShapeType.Rectangle | TDShapeType.Ellipse
const shapeShapes: ShapeShape[] = [TDShapeType.Rectangle, TDShapeType.Ellipse]
const shapeShapeIcons = {
  [TDShapeType.Rectangle]: <SquareIcon />,
  [TDShapeType.Ellipse]: <CircleIcon />,
}

export const ShapesMenu = React.memo(function ShapesMenu({
  activeTool,
  isToolLocked,
}: ShapesMenuProps) {
  const app = useTldrawApp()

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

  const isActive = shapeShapes.includes(activeTool as ShapeShape)

  return (
    <DropdownMenu.Root dir="ltr" onOpenChange={selectShapeTool}>
      <DropdownMenu.Trigger dir="ltr" asChild>
        <ToolButton
          variant="primary"
          onDoubleClick={handleDoubleClick}
          isToolLocked={isActive && isToolLocked}
          isActive={isActive}
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
