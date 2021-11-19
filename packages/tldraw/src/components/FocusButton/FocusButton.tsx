import { DotFilledIcon } from '@radix-ui/react-icons'
import * as React from 'react'
import { IconButton } from '~components/Primitives/IconButton/IconButton'
import { styled } from '~styles'

interface FocusButtonProps {
  onSelect: () => void
}

export function FocusButton({ onSelect }: FocusButtonProps) {
  return (
    <StyledButtonContainer>
      <IconButton onClick={onSelect}>
        <DotFilledIcon />
      </IconButton>
    </StyledButtonContainer>
  )
}

const StyledButtonContainer = styled('div', {
  opacity: 1,
  zIndex: 100,
  backgroundColor: 'transparent',

  '& svg': {
    color: '$text',
  },

  '&:hover svg': {
    color: '$text',
  },
})
