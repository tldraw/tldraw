import { defineMessages } from '../tla/utils/i18n'

export const fairyMessages = defineMessages({
	// Toolbar and navigation (aria-labels)
	toolbar: { defaultMessage: 'Fairies' },
	taskList: { defaultMessage: 'Task list' },
	selectFairy: { defaultMessage: 'Select fairy' },
	deselectFairy: { defaultMessage: 'Deselect fairy' },
	joinSelectedFairies: { defaultMessage: 'Join selected fairies' },
	resetChat: { defaultMessage: 'Clear' },
	resetAllChats: { defaultMessage: 'Clear all' },

	// Task list (titles and placeholders)
	addTaskPlaceholder: { defaultMessage: 'Add a new task…' },
	dragToCanvas: { defaultMessage: 'Drag to canvas' },
	clickToRemoveOrDrag: { defaultMessage: 'Click to remove or drag to move' },
	deleteTask: { defaultMessage: 'Delete task' },

	// Fairy menu (labels)
	goToFairy: { defaultMessage: 'Locate' },
	summonFairy: { defaultMessage: 'Summon' },
	followFairy: { defaultMessage: 'Follow' },
	unfollowFairy: { defaultMessage: 'Unfollow' },
	putAwayFairy: { defaultMessage: 'Sleep' },
	wakeFairy: { defaultMessage: 'Wake' },
	summonAllFairies: { defaultMessage: 'Summon all' },
	putAwayAllFairies: { defaultMessage: 'Sleep all' },
	disbandGroup: { defaultMessage: 'Disband group' },
	resetEverything: { defaultMessage: 'Hard reset' },
	fairyManagement: { defaultMessage: 'Manage' },

	// Task list menu (labels)
	summonFairies: { defaultMessage: 'Summon fairies' },
	disbandProjects: { defaultMessage: 'Disband projects' },
	resetChats: { defaultMessage: 'Clear chats' },
	putAwayFairies: { defaultMessage: 'Sleep fairies' },
	debugView: { defaultMessage: 'Debug view' },

	// Fairy config dialog (placeholders)
	fairyNamePlaceholder: { defaultMessage: "Fairy's name" },

	// Group chat (placeholders and aria-labels)
	instructGroupPlaceholder: { defaultMessage: 'Instruct the group…' },
	selectLeaderFirstPlaceholder: { defaultMessage: 'Select a leader first…' },
	stopTitle: { defaultMessage: 'Stop' },
	sendTitle: { defaultMessage: 'Send' },

	// Fairy input (placeholder and title)
	whisperToFairy: { defaultMessage: 'Speak to {name}…' },
	stopLabel: { defaultMessage: 'Stop' },
	sendLabel: { defaultMessage: 'Send' },
	enterMsg: { defaultMessage: 'Enter your message' },

	// HUD toggle labels
	switchToFairyChat: { defaultMessage: 'Switch to fairy chat' },
	switchToTaskList: { defaultMessage: 'Switch to task list' },
})
