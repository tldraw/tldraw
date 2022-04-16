import * as React from 'react'
import { styled } from '~styles'
import { SmallIcon } from '../SmallIcon'

export interface TextFieldProps {
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  icon?: React.ReactElement
}

export const TextField = ({ value, onChange, placeholder = '', icon }: TextFieldProps) => {
  return (
    <StyledInputWrapper>
      <StyledInput value={value} onChange={onChange} placeholder={placeholder} />
      {icon ? <StyledInputIcon>{icon}</StyledInputIcon> : null}
    </StyledInputWrapper>
  )
}

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
})
