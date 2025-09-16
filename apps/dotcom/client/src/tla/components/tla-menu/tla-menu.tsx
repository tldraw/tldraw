import classNames from 'classnames'
import { Select as _Select } from 'radix-ui'
import {
	ChangeEvent,
	createContext,
	HTMLAttributes,
	ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from 'react'
import { TldrawUiButton, TldrawUiIcon, TldrawUiTooltip } from 'tldraw'
import { defineMessages, useMsg } from '../../utils/i18n'
import { TlaIcon } from '../TlaIcon/TlaIcon'
import styles from './menu.module.css'

const messages = defineMessages({
	help: { defaultMessage: 'Help' },
})

// Used to section areas of the menu, ie links vs snapshots
export function TlaMenuSection({ children }: { children: ReactNode }) {
	return <div className={styles.menuSection}>{children}</div>
}

// Used to group together adjacent controls, ie switches or selects
export function TlaMenuControlGroup({ children }: { children: ReactNode }) {
	return <div className={styles.menuControlGroup}>{children}</div>
}

// A row for a single control, usually label + input
export function TlaMenuControl({ children, title }: { children: ReactNode; title?: string }) {
	return (
		<div className={classNames('tla-control', styles.menuControlRow)} title={title}>
			{children}
		</div>
	)
}

// An info button for a single control
export function TlaMenuControlInfoTooltip({
	href,
	children,
	onClick,
	showOnMobile,
}: {
	href?: string
	onClick?(): void
	children: ReactNode
	showOnMobile?: boolean
}) {
	const helpMsg = useMsg(messages.help)

	return (
		<div className={styles.menuInfoTriggerContainer}>
			<TldrawUiTooltip content={children} showOnMobile={showOnMobile} delayDuration={0}>
				{href ? (
					<a
						onClick={onClick}
						href={href}
						target="_blank nofollow noreferrer"
						className={styles.menuInfoTrigger}
					>
						<TldrawUiIcon label={helpMsg} icon="help-circle" small />
					</a>
				) : (
					<TldrawUiButton type="icon" className={styles.menuInfoTrigger}>
						<TldrawUiIcon label={helpMsg} icon="help-circle" small />
					</TldrawUiButton>
				)}
			</TldrawUiTooltip>
		</div>
	)
}

// A label for a control
export function TlaMenuControlLabel({
	children,
	htmlFor,
}: {
	children: ReactNode
	htmlFor: string
}) {
	return (
		<label className={classNames(styles.menuLabel, 'tla-text_ui__medium')} htmlFor={htmlFor}>
			{children}
		</label>
	)
}

// A detail
export function TlaMenuDetail({ children }: { children: ReactNode }) {
	return (
		<div className={classNames(styles.menuDetailCentered, 'tla-text_ui__small')}>{children}</div>
	)
}

/* --------------------- Select --------------------- */

export function TlaMenuSelect<T extends string>({
	id,
	label,
	value,
	disabled,
	onChange,
	options,
	'data-testid': dataTestId,
}: {
	id: string
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
			if (!target.closest(`.${styles.menuSelectContent}`)) {
				setIsOpen(false)
			}
		}

		document.body.addEventListener('pointerdown', handlePointerDown, { capture: true })
		return () => {
			document.body.removeEventListener('pointerdown', handlePointerDown)
		}
	}, [isOpen])

	return (
		<div className={styles.menuSelectWrapper}>
			<_Select.Root
				open={isOpen}
				value={value}
				onOpenChange={handleOpenChange}
				onValueChange={handleChange}
			>
				<_Select.Trigger
					id={id}
					className={styles.menuSelectTrigger}
					disabled={disabled}
					aria-label={label}
					data-testid={dataTestId}
				>
					<_Select.Value asChild>
						<div className={styles.menuSelectLabel}>{label}</div>
					</_Select.Value>
					<_Select.Icon>
						<TlaIcon icon="chevron-down" className={styles.menuSelectChevron} />
					</_Select.Icon>
				</_Select.Trigger>
				<_Select.Content className={styles.menuSelectContent}>
					<_Select.Viewport>
						{options.map((option) => (
							<_Select.Item
								key={option.value}
								className={styles.menuSelectOption}
								value={option.value}
							>
								<_Select.ItemIndicator>
									<TlaIcon icon="check" />
								</_Select.ItemIndicator>
								<_Select.ItemText>{option.label}</_Select.ItemText>
							</_Select.Item>
						))}
					</_Select.Viewport>
				</_Select.Content>
			</_Select.Root>
		</div>
	)
}

/* --------------------- Switch --------------------- */

export interface TlaMenuSwitchProps extends Omit<HTMLAttributes<HTMLInputElement>, 'onChange'> {
	id: string
	checked: boolean
	onChange?(checked: boolean): void
	disabled?: boolean
}

export function TlaMenuSwitch({ id, checked, onChange, disabled, ...rest }: TlaMenuSwitchProps) {
	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			onChange?.(e.currentTarget.checked)
		},
		[onChange]
	)

	return (
		<div
			className={classNames(
				'tla-switch',
				styles.menuSwitchContainer,
				disabled && styles.menuSwitchDisabled
			)}
		>
			<div className={styles.menuSwitch} data-checked={checked} />
			<input
				id={id}
				name="shared"
				disabled={disabled}
				role="switch"
				type="checkbox"
				checked={checked}
				onChange={handleChange}
				{...rest}
			/>
		</div>
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

interface TlaMenuTabsContext {
	activeTab: string
	onTabChange(tab: string): void
}

const tabsContext = createContext({} as TlaMenuTabsContext)

export function TlaMenuTabsRoot({
	activeTab,
	onTabChange,
	children,
}: TlaMenuTabsContext & { children: ReactNode }) {
	return <tabsContext.Provider value={{ activeTab, onTabChange }}>{children}</tabsContext.Provider>
}

export function TlaMenuTabsTabs({ children }: { children: ReactNode }) {
	return (
		<div className={styles.menuTabsTabs} role="tablist">
			{children}
			<div className={styles.menuTabsLine} />
		</div>
	)
}

export function TlaMenuTabsTab({
	id,
	disabled = false,
	...props
}: {
	id: string
	disabled?: boolean
	children: ReactNode
} & HTMLAttributes<HTMLButtonElement>) {
	const { activeTab, onTabChange } = useContext(tabsContext)

	const handleClick = useCallback(() => {
		onTabChange(id)
	}, [onTabChange, id])

	return (
		<button
			className={classNames(styles.menuTabsTab, 'tla-text_ui__medium')}
			data-active={activeTab === id}
			onClick={handleClick}
			disabled={disabled}
			aria-selected={activeTab === id}
			aria-controls={`tla-tabpanel-${id}`}
			role="tab"
			{...props}
		/>
	)
}

export function TlaMenuTabsPage({ id, ...props }: { id: string } & HTMLAttributes<HTMLDivElement>) {
	const { activeTab } = useContext(tabsContext)
	if (activeTab !== id) return null
	return <div id={`tla-tabpanel-${id}`} role="tabpanel" {...props} />
}
