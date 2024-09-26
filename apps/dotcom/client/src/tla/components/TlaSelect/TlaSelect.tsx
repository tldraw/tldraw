import { ChangeEvent, ReactNode, useCallback } from 'react'
import { TlaIcon } from '../TlaIcon'
import styles from './select.module.css'

export function TlaSelect<T extends string>({
	label,
	value,
	onChange,
	children,
}: {
	label: string
	value: T
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
		<div className={styles.container}>
			<div className={styles.label}>
				<span>{label}</span>
				<TlaIcon icon="chevron-down" />
			</div>
			<select className={styles.select} value={value} onChange={handleChange}>
				{children}
			</select>
		</div>
	)
}
