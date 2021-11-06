import * as React from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import { BoxIcon, IsFilledIcon } from '~components/icons'
import { ToolButton } from '~components/ToolButton'

const isFilledSelector = (s: Data) => s.appState.selectedStyle.isFilled

export const FillCheckbox = React.memo(function FillCheckbox(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()

  const isFilled = useSelector(isFilledSelector)

  const handleIsFilledChange = React.useCallback(
    (isFilled: boolean) => tlstate.style({ isFilled }),
    [tlstate]
  )

  return (
    <Checkbox.Root dir="ltr" asChild checked={isFilled} onCheckedChange={handleIsFilledChange}>
      <ToolButton variant="icon">
        <BoxIcon />
        <Checkbox.Indicator>
          <IsFilledIcon />
        </Checkbox.Indicator>
      </ToolButton>
    </Checkbox.Root>
  )
})
