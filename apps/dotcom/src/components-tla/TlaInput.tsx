import { InputHTMLAttributes } from 'react'

export function TlaInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`tla_input tla_text_ui__regular ${props.className ?? ''}`} />
}
