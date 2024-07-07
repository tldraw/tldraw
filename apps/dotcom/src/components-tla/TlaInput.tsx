import { InputHTMLAttributes } from 'react'

export function TlaInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`tla_input ${props.className ?? ''}`} />
}
