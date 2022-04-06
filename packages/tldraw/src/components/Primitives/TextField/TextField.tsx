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
      {icon ? <StyledInputIcon>{icon}</StyledInputIcon> : null}
      <StyledInput value={value} onChange={onChange} placeholder={placeholder} />
    </StyledInputWrapper>
  )
}

export const StyledInput = styled('input', {
  color: '$text',
  border: 'none',
  textAlign: 'center',
  width: '100%',
  height: '32px',
  outline: 'none',
  fontFamily: '$ui',
  fontSize: '$1',
})

const StyledInputWrapper = styled('div', {
  position: 'relative',
  width: '100%',
  height: 'min-content',
})

const StyledInputIcon = styled(SmallIcon, {
  position: 'absolute',
  left: '$3',
})
