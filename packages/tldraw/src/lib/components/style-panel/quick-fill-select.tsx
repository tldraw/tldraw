import * as React from 'react'
import * as Checkbox from '@radix-ui/react-checkbox'
import { breakpoints, IconButton, IconWrapper } from '../shared'
import { BoxIcon, IsFilledFillIcon } from './shared'
import { state, useSelector, TLD } from '../../state'
import { Tooltip } from '../tooltip'

function handleIsFilledChange(isFilled: boolean) {
  state.send('CHANGED_STYLE', { isFilled })
}

export const IsFilledPicker = React.memo((): JSX.Element => {
  const isFilled = useSelector((s) => s.values.selectedStyle.isFilled)

  return (
    <Checkbox.Root dir="ltr" as={IconButton} bp={breakpoints} checked={isFilled} onCheckedChange={handleIsFilledChange}>
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
