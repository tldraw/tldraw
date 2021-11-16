import * as React from 'react'
import { Item } from '@radix-ui/react-dropdown-menu'
import { RowButton, RowButtonProps } from '~components/RowButton'

export function DMItem({
  onSelect,
  ...rest
}: RowButtonProps & { onSelect?: (event: Event) => void }): JSX.Element {
  return (
    <Item dir="ltr" asChild onSelect={onSelect}>
      <RowButton {...rest} />
    </Item>
  )
}
