import { Icon, IconName } from '@/components/icon'
import Link from 'next/link'

export const SocialLink: React.FC<{ caption: string; icon: IconName; href: string }> = ({
	caption,
	icon,
	href,
}) => {
	return (
		<Link href={href} target="_blank" rel="noreferrer">
			<span className="sr-only">{caption}</span>
			<Icon icon={icon} className="h-5 hover:text-zinc-600" />
		</Link>
	)
}
