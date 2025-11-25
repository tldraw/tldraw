import * as HeroiconsSolid from '@heroicons/react/20/solid'
import * as HeroiconsOutline from '@heroicons/react/24/outline'
import { DiscordIcon } from './discord'
import { GithubIcon } from './github'
import { LinkedinIcon } from './linkedin'
import { TldrawIcon } from './tldraw'
import { TwitterIcon } from './twitter'

const icons = {
	check: HeroiconsOutline.CheckIcon,
	discord: DiscordIcon,
	github: GithubIcon,
	tldraw: TldrawIcon,
	twitter: TwitterIcon,
	linkedin: LinkedinIcon,
	paperclip: HeroiconsOutline.PaperClipIcon,
	play: HeroiconsSolid.PlayIcon,
	copy: HeroiconsOutline.ClipboardIcon,
}

export type IconName = keyof typeof icons

export function Icon({ icon, className }: { icon: IconName; className: string }) {
	const IconComponent = icons[icon]
	return <IconComponent className={className} />
}
