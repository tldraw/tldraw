import * as Select from '@radix-ui/react-select'
import { ReactNode, useCallback } from 'react'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './select.module.css'

export function TlaSelect<T extends string>({
	label,
	value,
	disabled,
	onChange,
	options,
}: {
	label: string
	value: T
	disabled?: boolean
	onChange(value: T): void
	options: { value: T; label: ReactNode }[]
}) {
	const handleChange = useCallback(
		(value: string) => {
			onChange(value as T)
		},
		[onChange]
	)

	return (
		<Select.Root value={value} onValueChange={handleChange}>
			<Select.Trigger className={styles.trigger} disabled={disabled} aria-label={label}>
				<span className={styles.label}>{label}</span>
				<Select.Icon>
					<TlaIcon icon="chevron-down" className={styles.chevron} />
				</Select.Icon>
			</Select.Trigger>
			<Select.Content className={styles.content} asChild position="popper">
				<div>
					{options.map((option) => (
						<Select.Item key={option.value} className={styles.option} value={option.value}>
							<Select.ItemText>{option.label}</Select.ItemText>
							<Select.ItemIndicator>
								<TlaIcon icon="check" />
							</Select.ItemIndicator>
						</Select.Item>
					))}
				</div>
			</Select.Content>
		</Select.Root>
	)
}
