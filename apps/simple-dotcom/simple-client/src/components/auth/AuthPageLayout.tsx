import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'
import { ReactNode } from 'react'

interface AuthPageLayoutProps {
	/** Optional invite context message to display at the top */
	inviteContext?: string | null
	/** Page title (e.g., "Sign in" or "Create your account") */
	title: string
	/** Main form content */
	children: ReactNode
}

/**
 * Shared layout for authentication pages (login, signup)
 * Provides consistent styling and structure
 */
export function AuthPageLayout({ inviteContext, title, children }: AuthPageLayoutProps) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<div className="w-full max-w-md space-y-8">
				{inviteContext && (
					<Alert>
						<Info className="h-4 w-4" />
						<AlertDescription>{inviteContext}</AlertDescription>
					</Alert>
				)}

				<div className="text-center space-y-2">
					<h1 className=" font-bold">{title}</h1>
				</div>

				{children}
			</div>
		</div>
	)
}
