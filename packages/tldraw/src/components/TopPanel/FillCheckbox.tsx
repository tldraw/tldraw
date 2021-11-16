import * as React from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { useTldrawApp } from '~hooks'
import type { TldrawSnapshot } from '~types'
import { BoxIcon, IsFilledIcon } from '~components/icons'
import { ToolButton } from '~components/ToolButton'

const isFilledSelector = (s: TldrawSnapshot) => s.appState.selectedStyle.isFilled

export const FillCheckbox = React.memo(function FillCheckbox(): JSX.Element {
  const app = useTldrawApp()

  const isFilled = app.useStore(isFilledSelector)

  const handleIsFilledChange = React.useCallback(
    (isFilled: boolean) => app.style({ isFilled }),
    [app]
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
