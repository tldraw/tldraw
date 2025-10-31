import { PersonalityPart } from '@tldraw/fairy-shared'
import { PromptPartUtil } from './PromptPartUtil'

export class PersonalityPartUtil extends PromptPartUtil<PersonalityPart> {
	static override type = 'personality' as const

	override getPart(): PersonalityPart {
		const personality = this.agent.$fairyConfig.get().personality
		return {
			type: 'personality',
			personality: personality || '',
		}
	}
}
