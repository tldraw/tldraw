import * as Select from '@radix-ui/react-select'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './select.module.css'

export function TlaSelect<T extends string>({
	label,
	value,
	disabled,
	onChange,
	options,
	'data-testid': dataTestId,
}: {
	label: string
	value: T
	disabled?: boolean
	onChange(value: T): void
	options: { value: T; label: ReactNode }[]
	'data-testid'?: string
}) {
	const [isOpen, setIsOpen] = useState(false)
	const handleChange = useCallback(
		(value: string) => {
			onChange(value as T)
		},
		[onChange]
	)

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open)
	}

	useEffect(() => {
		if (!isOpen) return
		// Close the select menu when the user clicks outside of it
		// This is a workaround for an issue in Radix Select when combined with a popper menu.
		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target as HTMLElement
			if (!target.closest(`.${styles.content}`)) {
				setIsOpen(false)
			}
		}

		document.body.addEventListener('pointerdown', handlePointerDown, { capture: true })
		return () => {
			document.body.removeEventListener('pointerdown', handlePointerDown)
		}
	}, [isOpen])

	return (
		<div className={styles.wrapper}>
			<Select.Root
				open={isOpen}
				value={value}
				onOpenChange={handleOpenChange}
				onValueChange={handleChange}
			>
				<Select.Trigger
					className={styles.trigger}
					disabled={disabled}
					aria-label={label}
					data-testid={dataTestId}
				>
					<span className={styles.label}>{label}</span>
					<Select.Icon>
						<TlaIcon icon="chevron-down" className={styles.chevron} />
					</Select.Icon>
				</Select.Trigger>
				<Select.Content className={styles.content}>
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
		</div>
	)
}
