import classNames from 'classnames'
import { ChangeEvent, HTMLAttributes, useCallback, useId } from 'react'

/** @public */
export interface TldrawUiSwitchProps extends HTMLAttributes<HTMLDivElement> {
	checked: boolean
	onCheckedChange?(checked: boolean): void
	disabled?: boolean
	label?: string
	id?: string
}

/** @public @react */
export function TldrawUiSwitch({
	checked,
	onCheckedChange,
	disabled,
	label,
	id,
	className,
	...props
}: TldrawUiSwitchProps) {
	const generatedId = useId()
	const inputId = id ?? generatedId

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			onCheckedChange?.(e.currentTarget.checked)
		},
		[onCheckedChange]
	)

	return (
		<div
			{...props}
			className={classNames('tl-switch', disabled && 'tl-switch--disabled', className)}
		>
			<div className="tl-switch__thumb" data-checked={checked} />
			<input
				id={inputId}
				disabled={disabled}
				role="switch"
				type="checkbox"
				checked={checked}
				aria-label={label}
				onChange={handleChange}
			/>
		</div>
	)
}
