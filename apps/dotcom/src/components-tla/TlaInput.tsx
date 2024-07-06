import { InputHTMLAttributes } from 'react'

export function TlaInput(props: InputHTMLAttributes<HTMLInputElement> & { validated?: boolean }) {
	return <input {...props} className={`tla_input tla_text_ui__regular ${props.className ?? ''}`} />
}
