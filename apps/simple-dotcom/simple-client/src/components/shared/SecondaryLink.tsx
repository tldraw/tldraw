import { cn } from '@/lib/utils'
import Link from 'next/link'
import { ComponentProps } from 'react'

/**
 * A styled link component for secondary actions in forms
 * Used for "Sign up", "Log in", "Forgot password?" links
 */
export function SecondaryLink(props: ComponentProps<typeof Link>) {
	return (
		<Link
			{...props}
			className={cn('text-sm font-medium text-foreground/60 hover:underline', props.className)}
		/>
	)
}
