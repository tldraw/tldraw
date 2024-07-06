import { LabelHTMLAttributes } from 'react'

export function TlaLabel({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label {...props} className={`tla_label tla_text_ui__regular ${props.className ?? ''}`}>
			<span>{children}</span>
		</label>
	)
}
