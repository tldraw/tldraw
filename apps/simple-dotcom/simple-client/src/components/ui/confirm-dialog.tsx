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

export interface ConfirmDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	confirmText?: string
	cancelText?: string
	onConfirm: () => void | Promise<void>
	destructive?: boolean
	loading?: boolean
	confirmButtonTestId?: string
	cancelButtonTestId?: string
}

export function ConfirmDialog({
	open,
	onOpenChange,
	title,
	description,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
	onConfirm,
	destructive = false,
	loading = false,
	confirmButtonTestId,
	cancelButtonTestId,
}: ConfirmDialogProps) {
	const handleConfirm = async () => {
		await onConfirm()
		if (!loading) {
			onOpenChange(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
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
						variant={destructive ? 'destructive' : 'default'}
						onClick={handleConfirm}
						disabled={loading}
						data-testid={confirmButtonTestId}
					>
						{loading ? 'Processing...' : confirmText}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
