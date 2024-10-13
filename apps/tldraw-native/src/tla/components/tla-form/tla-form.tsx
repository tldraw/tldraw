import classNames from 'classnames'
import {
	FormHTMLAttributes,
	forwardRef,
	HTMLAttributes,
	HTMLProps,
	InputHTMLAttributes,
	LabelHTMLAttributes,
} from 'react'
import styles from './form.module.css'

export function TlaForm(props: FormHTMLAttributes<HTMLFormElement>) {
	return <form {...props} className={classNames(styles.form, props.className)} />
}

export function TlaFormGroup(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className={classNames(styles.group, props.className)} />
}

export function TlaFormItem(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className={classNames(styles.item, props.className)} />
}

// A label mostly for an input
export function TlaFormLabel({ children, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
	return (
		<label {...props} className={classNames(styles.label, 'tla-text_ui__medium', props.className)}>
			<span>{children}</span>
		</label>
	)
}

export const TlaFormInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	function TlaFormInput(props, ref) {
		return (
			<input
				{...props}
				ref={ref}
				className={classNames(styles.input, 'tla-text_ui__regular', props.className)}
			/>
		)
	}
)

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
