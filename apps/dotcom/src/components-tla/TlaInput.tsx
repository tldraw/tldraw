import { InputHTMLAttributes } from 'react'

export function TlaInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`tla-input ${props.className ?? ''}`} />
}
