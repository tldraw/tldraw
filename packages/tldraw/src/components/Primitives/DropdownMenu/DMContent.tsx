import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { styled } from '~styles/stitches.config'
import { MenuContent } from '~components/Primitives/MenuContent'
import { stopPropagation } from '~components/stopPropagation'

export interface DMContentProps {
  variant?: 'menu' | 'horizontal'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  children: React.ReactNode
  id?: string
  side?: 'top' | 'left' | 'right' | 'bottom' | undefined
}

export function DMContent({
  sideOffset = 8,
  children,
  align,
  variant,
  id,
  side = 'bottom',
}: DMContentProps) {
  return (
    <DropdownMenu.Content
      dir="ltr"
      align={align}
      sideOffset={sideOffset}
      onEscapeKeyDown={stopPropagation}
      asChild
      id={id}
      side={side}
    >
      <StyledContent variant={variant}>{children}</StyledContent>
    </DropdownMenu.Content>
  )
}

export const StyledContent = styled(MenuContent, {
  width: 'fit-content',
  height: 'fit-content',
  minWidth: 0,
  maxHeight: '75vh',
  overflowY: 'auto',
  '& *': {
    boxSizing: 'border-box',
  },
  variants: {
    variant: {
      horizontal: {
        flexDirection: 'row',
      },
      menu: {
        minWidth: 128,
      },
    },
  },
})
