import { ChangeEvent, useCallback } from 'react'
import styles from './switch.module.css'

export function TlaSwitch({
	checked,
	onChange,
}: {
	checked: boolean
	onChange(checked: boolean): void
}) {
	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			onChange(e.currentTarget.checked)
		},
		[onChange]
	)

	return (
		<div className={styles.container}>
			<div className={styles.switch} data-checked={checked} />
			<input name="shared" type="checkbox" checked={checked} onChange={handleChange} />
		</div>
	)
}
