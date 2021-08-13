import * as React from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { BoxIcon, IsFilledFillIcon } from './styled'
import { breakpoints, Tooltip, IconButton, IconWrapper } from '../shared'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'

const isFilledSelector = (data: Data) => data.appState.selectedStyle.isFilled

export const QuickFillSelect = React.memo((): JSX.Element => {
  const { tlstate, useSelector } = useTLDrawContext()

  const isFilled = useSelector(isFilledSelector)

  const handleIsFilledChange = React.useCallback(
    (isFilled: boolean) => {
      tlstate.style({ isFilled })
    },
    [tlstate]
  )

  return (
    <Checkbox.Root
      dir="ltr"
      as={IconButton}
      bp={breakpoints}
      checked={isFilled}
      onCheckedChange={handleIsFilledChange}
    >
      <Tooltip label="Fill">
        <IconWrapper>
          <BoxIcon />
          <Checkbox.Indicator>
            <IsFilledFillIcon />
          </Checkbox.Indicator>
        </IconWrapper>
      </Tooltip>
    </Checkbox.Root>
  )
})
