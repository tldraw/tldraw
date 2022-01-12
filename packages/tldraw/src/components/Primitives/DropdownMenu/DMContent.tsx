import * as React from 'react'
import { Content } from '@radix-ui/react-dropdown-menu'
import { styled } from '~styles/stitches.config'
import { MenuContent } from '~components/Primitives/MenuContent'
import { stopPropagation } from '~components/stopPropagation'

export interface DMContentProps {
  variant?: 'menu' | 'horizontal'
  align?: 'start' | 'center' | 'end'
  sideOffset?: number
  children: React.ReactNode
  id?: string
}

export function DMContent({
  sideOffset = 8,
  children,
  align,
  variant,
  id,
}: DMContentProps): JSX.Element {
  return (
    <Content
      dir="ltr"
      align={align}
      sideOffset={sideOffset}
      onEscapeKeyDown={stopPropagation}
      asChild
      id={id}
    >
      <StyledContent variant={variant}>{children}</StyledContent>
    </Content>
  )
}

export const StyledContent = styled(MenuContent, {
  width: 'fit-content',
  height: 'fit-content',
  minWidth: 0,
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
