import * as HeroiconsSolid from '@heroicons/react/20/solid'
import * as HeroiconsOutline from '@heroicons/react/24/outline'
import { DiscordIcon } from './discord'
import { GithubIcon } from './github'
import { TldrawIcon } from './tldraw'
import { TwitterIcon } from './twitter'

const icons = {
	check: HeroiconsOutline.CheckIcon,
	discord: DiscordIcon,
	github: GithubIcon,
	tldraw: TldrawIcon,
	twitter: TwitterIcon,
	paperclip: HeroiconsOutline.PaperClipIcon,
	play: HeroiconsSolid.PlayIcon,
}

export type IconName = keyof typeof icons

export const Icon: React.FC<{ icon: IconName; className: string }> = ({ icon, className }) => {
	const IconComponent = icons[icon]
	return <IconComponent className={className} />
}
