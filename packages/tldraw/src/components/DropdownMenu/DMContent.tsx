import * as React from 'react'
import { Content } from '@radix-ui/react-dropdown-menu'
import styled from '~styles/stitches.config'
import { MenuContent } from '~components/MenuContent'

export interface DMContentProps {
  variant?: 'grid' | 'menu' | 'horizontal'
  align?: 'start' | 'center' | 'end'
  children: React.ReactNode
}

export function DMContent({ children, align, variant }: DMContentProps): JSX.Element {
  return (
    <Content sideOffset={8} dir="ltr" asChild align={align}>
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
      grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(4, auto)',
        gap: 0,
      },
      horizontal: {
        flexDirection: 'row',
      },
      menu: {
        minWidth: 128,
      },
    },
  },
})
