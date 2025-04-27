import { Icon, IconName } from '@/components/common/icon'
import Link from 'next/link'

export function SocialLink({
	caption,
	icon,
	href,
}: {
	caption: string
	icon: IconName
	href: string
}) {
	return (
		<Link href={href} target="_blank" rel="noreferrer">
			<span className="sr-only">{caption}</span>
			<Icon icon={icon} className="h-5 hover:text-zinc-600 dark:hover:text-zinc-100" />
		</Link>
	)
}
