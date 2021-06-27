import * as Checkbox from '@radix-ui/react-checkbox'
import { CheckIcon } from '@radix-ui/react-icons'
import { strokes } from 'state/shape-styles'
import { Square } from 'react-feather'
import { IconWrapper, RowButton } from '../shared'

interface Props {
  isFilled: boolean
  onChange: (isFilled: boolean | string) => void
}

export default function IsFilledPicker({
  isFilled,
  onChange,
}: Props): JSX.Element {
  return (
    <Checkbox.Root
      dir="ltr"
      as={RowButton}
      bp={{ '@initial': 'mobile', '@sm': 'small' }}
      checked={isFilled}
      onCheckedChange={onChange}
    >
      <label htmlFor="fill">Fill</label>
      <IconWrapper>
        {isFilled || <Square stroke={strokes.Black} />}
        <Checkbox.Indicator as={CheckIcon} />
      </IconWrapper>
    </Checkbox.Root>
  )
}
