import classNames from 'classnames'
import { ChangeEvent, HTMLAttributes, useCallback } from 'react'
import styles from './switch.module.css'

export interface TlaSwitchProps extends Omit<HTMLAttributes<HTMLInputElement>, 'onChange'> {
	checked: boolean
	onChange?(checked: boolean): void
	disabled?: boolean
}

export function TlaSwitch({ checked, onChange, disabled, ...rest }: TlaSwitchProps) {
	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			onChange?.(e.currentTarget.checked)
		},
		[onChange]
	)

	return (
		<div className={classNames(styles.container, disabled && styles.disabled)}>
			<div className={styles.switch} data-checked={checked} />
			<input
				name="shared"
				disabled={disabled}
				type="checkbox"
				checked={checked}
				onChange={handleChange}
				{...rest}
			/>
		</div>
	)
}
