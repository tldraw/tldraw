import { defineMessages } from '../tla/utils/i18n'

export const fairyMessages = defineMessages({
	// Toolbar and navigation (aria-labels)
	toolbar: { defaultMessage: 'Fairies' },
	todoList: { defaultMessage: 'Todo list' },
	newFairy: { defaultMessage: 'New fairy' },
	selectFairy: { defaultMessage: 'Select fairy' },
	deselectFairy: { defaultMessage: 'Deselect fairy' },
	resetChat: { defaultMessage: 'Reset chat' },

	// Todo list (titles and placeholders)
	addTodoPlaceholder: { defaultMessage: 'Add a new todo…' },
	dragToCanvas: { defaultMessage: 'Drag to canvas' },
	clickToRemoveOrDrag: { defaultMessage: 'Click to remove or drag to move' },
	deleteTodo: { defaultMessage: 'Delete todo' },
	showTodosOnCanvas: { defaultMessage: 'Show todos on canvas' },
	hideTodosOnCanvas: { defaultMessage: 'Hide todos on canvas' },

	// Fairy menu (labels)
	goToFairy: { defaultMessage: 'Go to fairy' },
	summonFairy: { defaultMessage: 'Summon fairy' },
	followFairy: { defaultMessage: 'Follow fairy' },
	unfollowFairy: { defaultMessage: 'Unfollow fairy' },
	askForHelp: { defaultMessage: 'Ask for help' },
	customizeFairy: { defaultMessage: 'Customize fairy' },
	deleteFairy: { defaultMessage: 'Delete fairy' },

	// Todo list menu (labels)
	askForHelpFromEveryone: { defaultMessage: 'Ask for help' },
	summonAllFairies: { defaultMessage: 'Summon all fairies' },
	clearTodoList: { defaultMessage: 'Clear todo list' },
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
})
