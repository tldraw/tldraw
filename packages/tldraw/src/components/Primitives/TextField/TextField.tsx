import * as React from 'react'
import { styled } from '~styles'

export interface TextFieldProps {
  value: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}

export const TextField = ({ value, onChange, placeholder = '' }: TextFieldProps) => {
  return <StyledInput value={value} onChange={onChange} placeholder={placeholder} />
}

export const StyledInput = styled('input', {
  color: '$text',
  border: '1px solid $text',
  borderRadius: '$2',
  textAlign: 'center',
  width: '100%',
  height: '32px',
  outline: 'none',
  fontFamily: '$ui',
  fontSize: '$1',
})
