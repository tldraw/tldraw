'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as React from 'react'

export interface PromptDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description?: string
	label?: string
	defaultValue?: string
	placeholder?: string
	onConfirm: (value: string) => void | Promise<void>
	confirmText?: string
	cancelText?: string
	loading?: boolean
	validationError?: string
	inputTestId?: string
	confirmButtonTestId?: string
	cancelButtonTestId?: string
}

export function PromptDialog({
	open,
	onOpenChange,
	title,
	description,
	label,
	defaultValue = '',
	placeholder,
	onConfirm,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	loading = false,
	validationError,
	inputTestId = 'workspace-name-input',
	confirmButtonTestId = 'confirm-create-workspace',
	cancelButtonTestId = 'cancel-dialog',
}: PromptDialogProps) {
	const [value, setValue] = React.useState(defaultValue)
	const inputRef = React.useRef<HTMLInputElement>(null)

	// Reset value when dialog opens
	React.useEffect(() => {
		if (open) {
			setValue(defaultValue)
			// Focus and select text when dialog opens
			setTimeout(() => {
				inputRef.current?.focus()
				inputRef.current?.select()
			}, 0)
		}
	}, [open, defaultValue])

	const handleConfirm = async () => {
		const trimmedValue = value.trim()
		if (!trimmedValue) return

		await onConfirm(trimmedValue)
		// Note: Parent component is responsible for closing the dialog
		// via onOpenChange or by setting open=false
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			handleConfirm()
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && <DialogDescription>{description}</DialogDescription>}
				</DialogHeader>
				<div className="space-y-2">
					{label && <Label htmlFor="prompt-input">{label}</Label>}
					<Input
						ref={inputRef}
						id="prompt-input"
						data-testid={inputTestId}
						value={value}
						onChange={(e) => setValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						disabled={loading}
						className={validationError ? 'border-red-500' : ''}
					/>
					{validationError && <p className=" text-red-500 dark:text-red-400">{validationError}</p>}
				</div>
				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={loading}
						data-testid={cancelButtonTestId}
					>
						{cancelText}
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={loading || !value.trim()}
						data-testid={confirmButtonTestId}
					>
						{loading ? 'Processing...' : confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
