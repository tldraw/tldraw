import { defineMessages } from '../tla/utils/i18n'

export const fairyMessages = defineMessages({
	// Toolbar and navigation (aria-labels)
	toolbar: { defaultMessage: 'Fairies' },
	selectFairy: { defaultMessage: 'Select' },
	deselectFairy: { defaultMessage: 'Deselect' },
	closeChatPanel: { defaultMessage: 'Close' },
	joinSelectedFairies: { defaultMessage: 'Join' },
	resetChat: { defaultMessage: 'Clear' },
	resetAllChats: { defaultMessage: 'Clear all' },
	zoomToFairy: { defaultMessage: 'Zoom to fairy' },
	newChat: { defaultMessage: 'New chat' },
	moreOptions: { defaultMessage: 'More options' },

	// Fairy menu (labels)
	goToFairy: { defaultMessage: 'Go to' },
	summonFairy: { defaultMessage: 'Summon' },
	followFairy: { defaultMessage: 'Follow' },
	unfollowFairy: { defaultMessage: 'Unfollow' },
	putAwayFairy: { defaultMessage: 'Sleep' },
	wakeFairy: { defaultMessage: 'Wake' },
	putAwayAllFairies: { defaultMessage: 'Sleep all' },
	disbandGroup: { defaultMessage: 'Disband' },
	resetEverything: { defaultMessage: 'Hard reset' },
	fairyManagement: { defaultMessage: 'Manage' },
	selectAllFairiesLabel: { defaultMessage: 'Select all' },
	summonAllFairies: { defaultMessage: 'Summon all' },
	summonFairies: { defaultMessage: 'Summon' },
	disbandProjects: { defaultMessage: 'Disband' },
	resetChats: { defaultMessage: 'Clear' },
	putAwayFairies: { defaultMessage: 'Sleep' },

	// Fairy menu (debug)
	debug: { defaultMessage: 'Debug' },
	debugView: { defaultMessage: 'Debug view' },

	// Fairy config dialog (placeholders)
	fairyNamePlaceholder: { defaultMessage: "Fairy's name" },

	// Group chat (placeholders and aria-labels)
	instructGroupPlaceholder: { defaultMessage: 'Speak to the group…' },
	stopTitle: { defaultMessage: 'Stop' },
	sendTitle: { defaultMessage: 'Send' },

	// Fairy input (placeholder and title)
	whisperToFairy: { defaultMessage: 'Speak to {name}…' },
	stopLabel: { defaultMessage: 'Stop' },
	sendLabel: { defaultMessage: 'Send' },
	enterMsg: { defaultMessage: 'Enter your message' },

	// HUD toggle labels
	manual: { defaultMessage: 'Guide' },
	openManual: { defaultMessage: 'Open' },
	closeManual: { defaultMessage: 'Close' },
})
