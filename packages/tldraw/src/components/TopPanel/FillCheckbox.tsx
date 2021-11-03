import * as React from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import { SmallIcon } from '~components/SmallIcon'
import { Tooltip } from '~components/Tooltip'
import { BoxIcon, IsFilledIcon } from '~components/icons'
import { ToolButton } from '~components/ToolButton'

const isFilledSelector = (s: Data) => s.appState.selectedStyle.isFilled

export const FillCheckbox = React.memo((): JSX.Element => {
  const { tlstate, useSelector } = useTLDrawContext()

  const isFilled = useSelector(isFilledSelector)

  const handleIsFilledChange = React.useCallback(
    (isFilled: boolean) => tlstate.style({ isFilled }),
    [tlstate]
  )

  return (
    <Tooltip label="Fill">
      <Checkbox.Root dir="ltr" asChild checked={isFilled} onCheckedChange={handleIsFilledChange}>
        <ToolButton variant="icon">
          <BoxIcon />
          <Checkbox.Indicator>
            <IsFilledIcon />
          </Checkbox.Indicator>
        </ToolButton>
      </Checkbox.Root>
    </Tooltip>
  )
})
