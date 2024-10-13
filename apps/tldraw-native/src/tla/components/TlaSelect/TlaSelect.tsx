import { ChangeEvent, ReactNode, useCallback } from 'react'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './select.module.css'

export function TlaSelect<T extends string>({
	label,
	value,
	disabled,
	onChange,
	children,
}: {
	label: string
	value: T
	disabled?: boolean
	onChange(value: T): void
	children: ReactNode
}) {
	const handleChange = useCallback(
		(e: ChangeEvent<HTMLSelectElement>) => {
			onChange(e.currentTarget.value as T)
		},
		[onChange]
	)

	return (
		<div className={styles.container} data-disabled={disabled}>
			<div className={styles.label}>
				<span>{label}</span>
				<TlaIcon icon="chevron-down" className={styles.chevron} />
			</div>
			<select className={styles.select} value={value} onChange={handleChange} disabled={disabled}>
				{children}
			</select>
		</div>
	)
}
