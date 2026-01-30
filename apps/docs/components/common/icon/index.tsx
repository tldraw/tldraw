import * as HeroiconsSolid from '@heroicons/react/20/solid'
import * as HeroiconsOutline from '@heroicons/react/24/outline'
import { ChatGptIcon } from './chatgpt'
import { ClaudeIcon } from './claude'
import { DiscordIcon } from './discord'
import { GithubIcon } from './github'
import { LinkedinIcon } from './linkedin'
import { TldrawIcon } from './tldraw'
import { TwitterIcon } from './twitter'

const icons = {
	chatgpt: ChatGptIcon,
	check: HeroiconsOutline.CheckIcon,
	claude: ClaudeIcon,
	copy: HeroiconsOutline.ClipboardIcon,
	discord: DiscordIcon,
	github: GithubIcon,
	linkedin: LinkedinIcon,
	paperclip: HeroiconsOutline.PaperClipIcon,
	play: HeroiconsSolid.PlayIcon,
	sparkles: HeroiconsOutline.SparklesIcon,
	tldraw: TldrawIcon,
	twitter: TwitterIcon,
}

export type IconName = keyof typeof icons

export function Icon({ icon, className }: { icon: IconName; className: string }) {
	const IconComponent = icons[icon]
	return <IconComponent className={className} />
}
