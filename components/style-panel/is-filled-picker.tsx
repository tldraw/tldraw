import * as Checkbox from '@radix-ui/react-checkbox'
import { CheckIcon } from '@radix-ui/react-icons'
import { strokes } from 'state/shape-styles'
import { Square } from 'react-feather'
import { breakpoints, IconWrapper, RowButton } from '../shared'
import state, { useSelector } from 'state'

function handleIsFilledChange(isFilled: boolean) {
  state.send('CHANGED_STYLE', { isFilled })
}

export default function IsFilledPicker(): JSX.Element {
  const isFilled = useSelector((s) => s.values.selectedStyle.isFilled)

  return (
    <Checkbox.Root
      dir="ltr"
      as={RowButton}
      bp={breakpoints}
      checked={isFilled}
      onCheckedChange={handleIsFilledChange}
    >
      <label htmlFor="fill">Fill</label>
      <IconWrapper>
        {isFilled || <Square stroke={strokes.Black} />}
        <Checkbox.Indicator as={CheckIcon} />
      </IconWrapper>
    </Checkbox.Root>
  )
}
