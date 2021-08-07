import * as React from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { breakpoints, IconButton, IconWrapper } from '../shared'
import { BoxIcon, IsFilledFillIcon } from './shared'
import { Tooltip } from '../tooltip'
import { useTLDrawContext } from '../../hooks'
import { Data } from '../../state'

const isFilledSelector = (data: Data) => data.appState.selectedStyle.isFilled

export const QuickFillSelect = React.memo(
  (): JSX.Element => {
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
  }
)
