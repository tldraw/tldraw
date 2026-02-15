import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function stripHtml(html: string) {
	return html.replace(/<[^>]*>/g, '').trim()
}

export function formatDate(date: string) {
	return new Date(date).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
	})
}

export function formatDateShort(date: string) {
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	})
}
