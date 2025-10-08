// Toast utility wrapper for sonner
// Provides consistent toast notifications across the app

import { toast as sonnerToast } from 'sonner'

export const toast = {
	success: (message: string, options?: { description?: string; action?: any }) => {
		return sonnerToast.success(message, options)
	},

	error: (message: string, options?: { description?: string }) => {
		return sonnerToast.error(message, options)
	},

	info: (message: string, options?: { description?: string }) => {
		return sonnerToast.info(message, options)
	},

	warning: (message: string, options?: { description?: string }) => {
		return sonnerToast.warning(message, options)
	},

	loading: (message: string) => {
		return sonnerToast.loading(message)
	},

	promise: <T>(
		promise: Promise<T>,
		options: {
			loading: string
			success: string | ((data: T) => string)
			error: string | ((error: any) => string)
		}
	) => {
		return sonnerToast.promise(promise, options)
	},

	dismiss: (toastId?: string | number) => {
		return sonnerToast.dismiss(toastId)
	},
}
