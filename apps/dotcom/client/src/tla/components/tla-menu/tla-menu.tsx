import {
	TlMenuControl,
	TlMenuControlGroup,
	TlMenuControlInfoTooltip,
	TlMenuControlLabel,
	TlMenuDetail,
	TlMenuSection,
	TlSelect,
	TlSelectContent,
	TlSelectItem,
	TlSelectTrigger,
	TlSelectValue,
	TlSwitch,
	TlTabsPage,
	TlTabsRoot,
	TlTabsTab,
	TlTabsTabs,
	TlTooltip,
} from '@tldraw/ui'
import { HTMLAttributes, ReactNode, useCallback } from 'react'
import styles from './menu.module.css'

/**
 * Shared positioning for tla dropdowns, popovers, and selects so they sit consistently
 * relative to their triggers. Spread onto a Radix/SDK content element (e.g.
 * `{...TLA_MENU_POSITION}`); tweak here to adjust every tla menu at once. `side` and
 * `align` stay per-menu since they depend on the trigger's placement.
 */
export const TLA_MENU_POSITION = {
	sideOffset: 4,
	alignOffset: -4,
	collisionPadding: 4,
} as const

// Used to section areas of the menu, ie links vs snapshots
export { TlMenuSection as TlaMenuSection }

// Used to group together adjacent controls, ie switches or selects
export { TlMenuControlGroup as TlaMenuControlGroup }

// A row for a single control, usually label + input
export { TlMenuControl as TlaMenuControl }

// An info button for a single control
export { TlMenuControlInfoTooltip as TlaMenuControlInfoTooltip }

// A label for a control
export { TlMenuControlLabel as TlaMenuControlLabel }

// A detail
export { TlMenuDetail as TlaMenuDetail }

/* --------------------- Select --------------------- */

export function TlaMenuSelect<T extends string>({
	id,
	label,
	value,
	disabled,
	onChange,
	options,
	actions,
	'data-testid': dataTestId,
}: {
	id: string
	label: string
	value: T
	disabled?: boolean
	onChange(value: T): void
	options: { value: T; label: ReactNode; disabled?: boolean }[]
	// Extra actions shown in their own section below the options (e.g. a
	// destructive "remove"). Selecting one runs its onSelect instead of onChange.
	actions?: {
		id: string
		label: ReactNode
		onSelect(): void
		destructive?: boolean
		disabled?: boolean
		// Shown on hover when the action is disabled (e.g. why it can't be used).
		tooltip?: ReactNode
	}[]
	'data-testid'?: string
}) {
	const handleChange = useCallback(
		(value: string) => {
			const action = actions?.find((a) => a.id === value)
			if (action) {
				if (!action.disabled) action.onSelect()
				return
			}
			onChange(value as T)
		},
		[actions, onChange]
	)

	return (
		<div className={styles.menuSelectWrapper}>
			<TlSelect
				id={`${id}-menu`}
				value={value}
				onValueChange={handleChange}
				disabled={disabled}
				aria-label={label}
			>
				<TlSelectTrigger id={id} className={styles.menuSelectTrigger} data-testid={dataTestId}>
					<TlSelectValue>{label}</TlSelectValue>
				</TlSelectTrigger>
				<TlSelectContent className={styles.menuSelectContent} side="bottom" align="end">
					{options.map((option) => (
						<TlSelectItem
							key={option.value}
							value={option.value}
							label={option.label}
							disabled={option.disabled}
							className={styles.menuSelectOption}
						/>
					))}
					{actions && actions.length > 0 && (
						<>
							<div className={styles.menuSelectSeparator} role="separator" />
							{actions.map((action) => {
								const item = (
									<TlSelectItem
										key={action.id}
										value={action.id}
										label={action.label}
										disabled={action.disabled}
										destructive={action.destructive}
										className={styles.menuSelectOption}
									/>
								)
								if (!action.tooltip) return item
								return (
									<TlTooltip key={action.id} content={action.tooltip}>
										{item}
									</TlTooltip>
								)
							})}
						</>
					)}
				</TlSelectContent>
			</TlSelect>
		</div>
	)
}

/* --------------------- Switch --------------------- */

interface TlaMenuSwitchProps extends Omit<HTMLAttributes<HTMLDivElement>, 'onChange'> {
	id: string
	checked: boolean
	onChange?(checked: boolean): void
	disabled?: boolean
}

export function TlaMenuSwitch({
	id,
	checked,
	onChange,
	disabled,
	'aria-label': ariaLabel,
	...props
}: TlaMenuSwitchProps) {
	return (
		<TlSwitch
			{...props}
			id={id}
			checked={checked}
			onCheckedChange={onChange}
			disabled={disabled}
			label={ariaLabel}
		/>
	)
}

/* ---------------------- Tabs ---------------------- */

/*
This is a set of primitives for creating tabs in the UI. Structure is:

<Root>
	<Tabs>
		<Tab/>
		...
	</Tabs>
	<Page/>
	...
</Root>
*/

export { TlTabsRoot as TlaMenuTabsRoot }
export { TlTabsTabs as TlaMenuTabsTabs }
export { TlTabsTab as TlaMenuTabsTab }
export { TlTabsPage as TlaMenuTabsPage }
