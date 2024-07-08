import * as Heroicons from '@heroicons/react/24/outline'
import { DiscordIcon } from './discord'
import { GithubIcon } from './github'
import { TwitterIcon } from './twitter'

const icons = {
	check: Heroicons.CheckIcon,
	discord: DiscordIcon,
	github: GithubIcon,
	twitter: TwitterIcon,
	paperclip: Heroicons.PaperClipIcon,
}

export type IconName = keyof typeof icons

export const Icon: React.FC<{ icon: IconName; className: string }> = ({ icon, className }) => {
	const IconComponent = icons[icon]
	return <IconComponent className={className} />
}
