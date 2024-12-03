import { ChangeEvent, HTMLAttributes, useCallback } from 'react'
import styles from './switch.module.css'

export function TlaSwitch({
	checked,
	onChange,
	...rest
}: {
	checked: boolean
	onChange(checked: boolean): void
} & HTMLAttributes<HTMLInputElement>) {
	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			onChange(e.currentTarget.checked)
		},
		[onChange]
	)

	return (
		<div className={styles.container}>
			<div className={styles.switch} data-checked={checked} />
			<input name="shared" type="checkbox" checked={checked} onChange={handleChange} {...rest} />
		</div>
	)
}
