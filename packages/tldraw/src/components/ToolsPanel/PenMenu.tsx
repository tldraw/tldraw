import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Panel } from '~components/Panel'
import { ToolButton, ToolButtonWithTooltip } from '~components/ToolButton'
import { TLDrawShapeType, TLDrawToolType } from '~types'
import { useTLDrawContext } from '~hooks'
import { SquareIcon, CircleIcon, Pencil1Icon } from '@radix-ui/react-icons'
import { Tooltip } from '~components/Tooltip'

interface ShapesMenuProps {
  activeTool: TLDrawToolType
}

type PenShape = TLDrawShapeType.Draw
const penShapes: PenShape[] = [TLDrawShapeType.Draw]
const penShapeIcons = {
  [TLDrawShapeType.Draw]: <Pencil1Icon />,
}

export const PenMenu = React.memo(function PenMenu({ activeTool }: ShapesMenuProps) {
  const { state } = useTLDrawContext()

  const [lastActiveTool, setLastActiveTool] = React.useState<PenShape>(TLDrawShapeType.Draw)

  React.useEffect(() => {
    if (penShapes.includes(activeTool as PenShape) && lastActiveTool !== activeTool) {
      setLastActiveTool(activeTool as PenShape)
    }
  }, [activeTool])

  const selectShapeTool = React.useCallback(() => {
    state.selectTool(lastActiveTool)
  }, [activeTool, state])

  const handleDoubleClick = React.useCallback(() => {
    state.toggleToolLock()
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
                    state.selectTool(shape)
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
