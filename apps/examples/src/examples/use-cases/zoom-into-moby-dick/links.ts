import { type ZoomLink } from '../../../semantic-zoom/layout'

/**
 * Things the book plants early and pays off hundreds of pages later.
 *
 * These are the reason the layout is spatial rather than a list. Each pair is
 * separated by most of the novel, so drawn across the map they show at a glance
 * how far Melville is willing to carry a promise — and because both ends are
 * real page coordinates, following one is just a zoom.
 */
export const ECHOES: ZoomLink[] = [
	{
		from: 'chapter-1',
		to: 'chapter-136',
		label: 'Loomings → Epilogue: “And I only am escaped alone to tell thee.”',
	},
	{
		from: 'chapter-9',
		to: 'chapter-135',
		label: 'Mapple preaches obedience to God; Ahab answers with defiance to the last.',
	},
	{
		from: 'chapter-19',
		to: 'chapter-133',
		label: 'Elijah’s warning on the wharf, delivered at last.',
	},
	{
		from: 'chapter-16',
		to: 'chapter-28',
		label: 'A captain spoken of but never seen, finally on deck.',
	},
	{
		from: 'chapter-23',
		to: 'chapter-135',
		label: 'Bulkington’s lee shore: better to perish in that howling infinite.',
	},
	{
		from: 'chapter-36',
		to: 'chapter-132',
		label: 'The oath sworn on the quarter-deck; Starbuck’s last attempt to undo it.',
	},
	{
		from: 'chapter-41',
		to: 'chapter-133',
		label: 'The legend of the white whale, and the whale himself.',
	},
	{
		from: 'chapter-93',
		to: 'chapter-125',
		label: 'Pip’s reason drowns; Ahab is the one who takes him in.',
	},
	{
		from: 'chapter-110',
		to: 'chapter-126',
		label: 'The coffin Queequeg built for himself becomes the ship’s life-buoy.',
	},
	{
		from: 'chapter-113',
		to: 'chapter-135',
		label: 'The harpoon tempered in blood, and the dart it was forged for.',
	},
	{
		from: 'chapter-117',
		to: 'chapter-134',
		label: 'Fedallah promised to go first as pilot, and does.',
	},
	{
		from: 'chapter-117',
		to: 'chapter-135',
		label: 'Two hearses, and hemp: the prophecy read wrongly by the man it was for.',
	},
	{
		from: 'chapter-119',
		to: 'chapter-124',
		label: 'He defies the lightning, then remakes the compass it reversed.',
	},
	{
		from: 'chapter-126',
		to: 'chapter-136',
		label: 'The life-buoy that saves the only survivor.',
	},
	{
		from: 'chapter-128',
		to: 'chapter-136',
		label: 'The Rachel, refused her lost son, finds another orphan.',
	},
]
