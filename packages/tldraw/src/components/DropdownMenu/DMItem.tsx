import * as React from 'react'
import { Item } from '@radix-ui/react-dropdown-menu'
import { RowButton, RowButtonProps } from '~components/RowButton'

export function DMItem({ onSelect, ...rest }: RowButtonProps): JSX.Element {
  return (
    <Item dir="ltr" asChild onSelect={onSelect}>
      <RowButton {...rest} />
    </Item>
  )
}
