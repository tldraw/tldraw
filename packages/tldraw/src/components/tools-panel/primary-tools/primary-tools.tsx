import * as React from 'react'
import {
  ArrowTopRightIcon,
  CircleIcon,
  Pencil1Icon,
  SquareIcon,
  TextIcon,
} from '@radix-ui/react-icons'
import { Data, TLDrawShapeType } from '~types'
import { useTLDrawContext } from '~hooks'
import { floatingContainer } from '~components/shared'
import { PrimaryButton } from '~components/tools-panel/styled'

const activeToolSelector = (s: Data) => s.appState.activeTool

export const PrimaryTools = React.memo((): JSX.Element => {
  const { tlstate, useSelector } = useTLDrawContext()

  const activeTool = useSelector(activeToolSelector)

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

  return (
    <div className={floatingContainer()}>
      <PrimaryButton
        kbd={'2'}
        label={TLDrawShapeType.Draw}
        onClick={selectDrawTool}
        isActive={activeTool === TLDrawShapeType.Draw}
      >
        <Pencil1Icon />
      </PrimaryButton>
      <PrimaryButton
        kbd={'3'}
        label={TLDrawShapeType.Rectangle}
        onClick={selectRectangleTool}
        isActive={activeTool === TLDrawShapeType.Rectangle}
      >
        <SquareIcon />
      </PrimaryButton>
      <PrimaryButton
        kbd={'4'}
        label={TLDrawShapeType.Draw}
        onClick={selectEllipseTool}
        isActive={activeTool === TLDrawShapeType.Ellipse}
      >
        <CircleIcon />
      </PrimaryButton>
      <PrimaryButton
        kbd={'5'}
        label={TLDrawShapeType.Arrow}
        onClick={selectArrowTool}
        isActive={activeTool === TLDrawShapeType.Arrow}
      >
        <ArrowTopRightIcon />
      </PrimaryButton>
      <PrimaryButton
        kbd={'6'}
        label={TLDrawShapeType.Text}
        onClick={selectTextTool}
        isActive={activeTool === TLDrawShapeType.Text}
      >
        <TextIcon />
      </PrimaryButton>
    </div>
  )
})
