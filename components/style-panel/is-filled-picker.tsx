import * as Checkbox from '@radix-ui/react-checkbox'
import { CheckIcon } from '@radix-ui/react-icons'
import { strokes } from 'lib/shape-styles'
import { Square } from 'react-feather'
import { IconWrapper, RowButton } from '../shared'

interface Props {
  isFilled: boolean
  onChange: (isFilled: boolean) => void
}

export default function IsFilledPicker({ isFilled, onChange }: Props) {
  return (
    <Checkbox.Root
      as={RowButton}
      checked={isFilled}
      onCheckedChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        onChange(e.currentTarget.checked)
      }
    >
      <label htmlFor="fill">Fill</label>
      <IconWrapper>
        {isFilled || <Square stroke={strokes.Black} />}
        <Checkbox.Indicator as={CheckIcon} />
      </IconWrapper>
    </Checkbox.Root>
  )
}
