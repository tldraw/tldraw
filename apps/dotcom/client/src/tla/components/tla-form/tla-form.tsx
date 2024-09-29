import classNames from 'classnames'
import {
	FormHTMLAttributes,
	HTMLAttributes,
	HTMLProps,
	InputHTMLAttributes,
	LabelHTMLAttributes,
	ReactNode,
} from 'react'
import styles from './form.module.css'

export function TlaForm(props: FormHTMLAttributes<HTMLFormElement>) {
	return <form {...props} className={classNames(styles.form, props.className)} />
}

export function TlaFormGroup({ children }: { children: ReactNode }) {
	return <div className={styles.group}>{children}</div>
}

export function TlaFormItem({ children }: { children: ReactNode }) {
	return <div className={styles.item}>{children}</div>
}

// A label mostly for an input
export function TlaFormLabel({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label {...props} className={classNames(styles.label, 'tla-text_ui__medium', props.className)}>
			<span>{children}</span>
		</label>
	)
}

export function TlaFormInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<input
			{...props}
			className={classNames(styles.input, 'tla-text_ui__regular', props.className)}
		/>
	)
}

export function TlaFormCheckbox({ children, ...props }: HTMLProps<HTMLInputElement>) {
	return (
		<div className={styles.checkbox}>
			<input {...props} type="checkbox" className={classNames(styles.input, props.className)} />
			<label htmlFor={props.name} className={styles.label}>
				{children}
			</label>
		</div>
	)
}

export function TlaFormDivider({ children, ...props }: HTMLAttributes<HTMLDivElement>) {
	return (
		<div {...props} className={classNames(styles.divider, props.className)}>
			{children && <span>{children}</span>}
		</div>
	)
}
