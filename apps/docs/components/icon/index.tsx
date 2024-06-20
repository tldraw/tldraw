import { DiscordIcon } from './discord'
import { GithubIcon } from './github'
import { TwitterIcon } from './twitter'

const icons = {
	discord: DiscordIcon,
	github: GithubIcon,
	twitter: TwitterIcon,
}

export type IconName = keyof typeof icons

export const Icon: React.FC<{ icon: IconName; className: string }> = ({ icon, className }) => {
	const IconComponent = icons[icon]
	return <IconComponent className={className} />
}
