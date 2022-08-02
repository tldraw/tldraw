import { Item } from '@radix-ui/react-dropdown-menu'
import * as React from 'react'
import { RowButton, RowButtonProps } from '~components/Primitives/RowButton'

export function DMItem({
  onSelect,
  id,
  ...rest
}: RowButtonProps & { onSelect?: (event: Event) => void; id?: string }) {
  return (
    <Item dir="ltr" asChild onSelect={onSelect} id={id}>
      <RowButton {...rest} />
    </Item>
  )
}
