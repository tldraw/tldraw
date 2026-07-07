import classNames from 'classnames'
import { ChangeEvent, useCallback, useId } from 'react'

/** @public */
export interface TlSwitchProps {
	checked: boolean
	onCheckedChange?(checked: boolean): void
	disabled?: boolean
	label?: string
	id?: string
}

/** @public @react */
export function TlSwitch({ checked, onCheckedChange, disabled, label, id }: TlSwitchProps) {
	const generatedId = useId()
	const inputId = id ?? generatedId

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			onCheckedChange?.(e.currentTarget.checked)
		},
		[onCheckedChange]
	)

	return (
		<div className={classNames('tl-switch', disabled && 'tl-switch--disabled')}>
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
