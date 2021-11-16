import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Panel } from '~components/Panel'
import { ToolButton } from '~components/ToolButton'
import { TDShapeType, TDToolType } from '~types'
import { useTldrawApp } from '~hooks'
import { Pencil1Icon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Tooltip'

interface ShapesMenuProps {
  activeTool: TDToolType
}

type PenShape = TDShapeType.Draw
const penShapes: PenShape[] = [TDShapeType.Draw]
const penShapeIcons = {
  [TDShapeType.Draw]: <Pencil1Icon />,
}

export const PenMenu = React.memo(function PenMenu({ activeTool }: ShapesMenuProps) {
  const app = useTldrawApp()

  const [lastActiveTool, setLastActiveTool] = React.useState<PenShape>(TDShapeType.Draw)

  React.useEffect(() => {
    if (penShapes.includes(activeTool as PenShape) && lastActiveTool !== activeTool) {
      setLastActiveTool(activeTool as PenShape)
    }
  }, [activeTool])

  const selectShapeTool = React.useCallback(() => {
    app.selectTool(lastActiveTool)
  }, [activeTool, app])

  const handleDoubleClick = React.useCallback(() => {
    app.toggleToolLock()
  }, [])

  return (
    <DropdownMenu.Root dir="ltr">
      <DropdownMenu.Trigger dir="ltr" asChild>
        <ToolButton
          variant="primary"
          onDoubleClick={handleDoubleClick}
          onClick={selectShapeTool}
          isActive={penShapes.includes(activeTool as PenShape)}
        >
          {penShapeIcons[lastActiveTool]}
        </ToolButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content asChild dir="ltr" side="top" sideOffset={12}>
        <Panel side="center">
          {penShapes.map((shape, i) => (
            <Tooltip
              key={shape}
              label={shape[0].toUpperCase() + shape.slice(1)}
              kbd={(1 + i).toString()}
            >
              <DropdownMenu.Item asChild>
                <ToolButton
                  variant="primary"
                  onClick={() => {
                    app.selectTool(shape)
                    setLastActiveTool(shape)
                  }}
                >
                  {penShapeIcons[shape]}
                </ToolButton>
              </DropdownMenu.Item>
            </Tooltip>
          ))}
        </Panel>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
})
