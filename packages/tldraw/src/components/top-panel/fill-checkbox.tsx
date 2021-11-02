import * as React from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { BoxIcon, IsFilledFillIcon } from '~components/style-panel/styled'
import { breakpoints, Tooltip, iconWrapper } from '../shared'
import { toolButton, toolButtonInner } from '~components'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

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
      <Checkbox.Root
        dir="ltr"
        className={toolButton({ isActive: false, bp: breakpoints })}
        checked={isFilled}
        onCheckedChange={handleIsFilledChange}
      >
        <div
          className={toolButtonInner({
            bp: breakpoints,
          })}
        >
          <div className={iconWrapper()}>
            <BoxIcon />
            <Checkbox.Indicator>
              <IsFilledFillIcon />
            </Checkbox.Indicator>
          </div>
        </div>
      </Checkbox.Root>
    </Tooltip>
  )
})
