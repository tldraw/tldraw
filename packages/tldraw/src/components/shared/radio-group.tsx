import React from 'react'
import css from '~styles'
import { Root as RGRoot } from '@radix-ui/react-radio-group'

/* -------------------------------------------------- */
/*                     Radio Group                    */
/* -------------------------------------------------- */

export const group = css({
  display: 'flex',
})

export const Group = React.forwardRef<
  React.ElementRef<typeof RGRoot>,
  React.ComponentProps<typeof RGRoot>
>((props, forwardedRef) => (
  <RGRoot {...props} ref={forwardedRef} className={group({ className: props.className })} />
))
