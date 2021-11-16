import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Panel } from '~components/Panel'
import { ToolButton } from '~components/ToolButton'
import { TldrawShapeType, TldrawToolType } from '~types'
import { useTldrawApp } from '~hooks'
import { SquareIcon, CircleIcon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Tooltip'

interface ShapesMenuProps {
  activeTool: TldrawToolType
}

type ShapeShape = TldrawShapeType.Rectangle | TldrawShapeType.Ellipse
const shapeShapes: ShapeShape[] = [TldrawShapeType.Rectangle, TldrawShapeType.Ellipse]
const shapeShapeIcons = {
  [TldrawShapeType.Rectangle]: <SquareIcon />,
  [TldrawShapeType.Ellipse]: <CircleIcon />,
}

export const ShapesMenu = React.memo(function ShapesMenu({ activeTool }: ShapesMenuProps) {
  const app = useTldrawApp()

  const [lastActiveTool, setLastActiveTool] = React.useState<ShapeShape>(TldrawShapeType.Rectangle)

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

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger dir="ltr" asChild>
        <ToolButton
          variant="primary"
          onDoubleClick={handleDoubleClick}
          onClick={selectShapeTool}
          isActive={shapeShapes.includes(activeTool as ShapeShape)}
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
