import { defineMessages } from '../tla/utils/i18n'

export const fairyMessages = defineMessages({
	// Toolbar and navigation (aria-labels)
	toolbar: { defaultMessage: 'Fairies' },
	taskList: { defaultMessage: 'Task list' },
	newFairy: { defaultMessage: 'New fairy' },
	fairyLimitReached: {
		defaultMessage: "You've reached your limit of {count, plural, one {# fairy} other {# fairies}}",
	},
	selectFairy: { defaultMessage: 'Select fairy' },
	deselectFairy: { defaultMessage: 'Deselect fairy' },
	resetChat: { defaultMessage: 'Reset chat' },

	// Task list (titles and placeholders)
	addTaskPlaceholder: { defaultMessage: 'Add a new task…' },
	dragToCanvas: { defaultMessage: 'Drag to canvas' },
	clickToRemoveOrDrag: { defaultMessage: 'Click to remove or drag to move' },
	deleteTask: { defaultMessage: 'Delete task' },
	showTasksOnCanvas: { defaultMessage: 'Show tasks on canvas' },
	hideTasksOnCanvas: { defaultMessage: 'Hide tasks on canvas' },

	// Fairy menu (labels)
	goToFairy: { defaultMessage: 'Go to fairy' },
	summonFairy: { defaultMessage: 'Summon fairy' },
	followFairy: { defaultMessage: 'Follow fairy' },
	unfollowFairy: { defaultMessage: 'Unfollow fairy' },
	askForHelp: { defaultMessage: 'Ask for help' },
	customizeFairy: { defaultMessage: 'Customize fairy' },
	deleteFairy: { defaultMessage: 'Delete fairy' },

	// Task list menu (labels)
	askForHelpFromEveryone: { defaultMessage: 'Ask for help' },
	summonAllFairies: { defaultMessage: 'Summon all fairies' },
	clearTaskList: { defaultMessage: 'Clear task list' },
	resetAllChats: { defaultMessage: 'Reset all chats' },
	resetAllWands: { defaultMessage: 'Reset all wands' },
	deleteAllFairies: { defaultMessage: 'Delete all fairies' },
	debugView: { defaultMessage: 'Debug view' },

	// Fairy config dialog (placeholders)
	fairyNamePlaceholder: { defaultMessage: 'Fairy’s name' },
	fairyPersonalityPlaceholder: { defaultMessage: 'Fairy’s personality' },

	// Group chat (placeholders and aria-labels)
	leaderFairySelection: { defaultMessage: 'Leader fairy selection' },
	instructGroupPlaceholder: { defaultMessage: 'Instruct the group…' },
	selectLeaderFirstPlaceholder: { defaultMessage: 'Select a leader first…' },
	selectLeader: { defaultMessage: 'Select leader' },
	deselectLeader: { defaultMessage: 'Deselect leader' },
	stopTitle: { defaultMessage: 'Stop' },
	sendTitle: { defaultMessage: 'Send' },

	// Fairy input (placeholder and title)
	whisperToFairy: { defaultMessage: 'Whisper to {name}…' },
	stopLabel: { defaultMessage: 'Stop' },
	sendLabel: { defaultMessage: 'Send' },

	// HUD toggle labels
	switchToFairyChat: { defaultMessage: 'Switch to fairy chat' },
	switchToTaskList: { defaultMessage: 'Switch to task list' },

	// Hat types
	hatTop: { defaultMessage: 'Top' },
	hatPointy: { defaultMessage: 'Pointy' },
	hatBald: { defaultMessage: 'Bald' },
	hatAntenna: { defaultMessage: 'Antenna' },
	hatSpiky: { defaultMessage: 'Spiky' },
	hatHair: { defaultMessage: 'Hair' },
	hatEars: { defaultMessage: 'Ears' },
	hatPropeller: { defaultMessage: 'Propeller' },
})
