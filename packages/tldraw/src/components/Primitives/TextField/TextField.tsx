import * as React from 'react'
import { SmallIcon } from '~components/Primitives/SmallIcon'
import { styled } from '~styles'

export interface TextFieldProps extends React.HTMLProps<HTMLInputElement> {
  icon?: React.ReactElement
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  ({ icon, ...rest }, ref) => {
    return (
      <StyledInputWrapper>
        <StyledInput {...rest} ref={ref} />
        {icon ? <StyledInputIcon>{icon}</StyledInputIcon> : null}
      </StyledInputWrapper>
    )
  }
)

const StyledInputWrapper = styled('div', {
  position: 'relative',
  width: '100%',
  height: 'min-content',
})

const StyledInput = styled('input', {
  color: '$text',
  border: 'none',
  textAlign: 'left',
  width: '100%',
  paddingLeft: '$3',
  paddingRight: '$6',
  backgroundColor: '$background',

  height: '32px',
  outline: 'none',
  fontFamily: '$ui',
  fontSize: '$1',
  '&:focus': {
    backgroundColor: '$hover',
  },
  borderRadius: '$2',
})

const StyledInputIcon = styled(SmallIcon, {
  top: 0,
  right: 0,
  position: 'absolute',
  paddingLeft: '$3',
  paddingRight: '$3',
  pointerEvents: 'none',
  color: '$text',
})
