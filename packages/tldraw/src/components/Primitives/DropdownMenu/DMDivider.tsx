import { Separator } from '@radix-ui/react-dropdown-menu'
import { styled } from '~styles/stitches.config'

export const DMDivider = styled(Separator, {
  backgroundColor: '$hover',
  height: 1,
  marginTop: '$2',
  marginRight: '-$2',
  marginBottom: '$2',
  marginLeft: '-$2',
})
