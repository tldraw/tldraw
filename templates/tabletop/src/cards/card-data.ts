export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'] as const
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

export type Suit = (typeof SUITS)[number]
export type Rank = (typeof RANKS)[number]

export const SUIT_SYMBOLS: Record<Suit, string> = {
	spades: '\u2660',
	hearts: '\u2665',
	diamonds: '\u2666',
	clubs: '\u2663',
}

export const SUIT_COLORS: Record<Suit, string> = {
	spades: '#1a1a1a',
	clubs: '#1a1a1a',
	hearts: '#cc0000',
	diamonds: '#cc0000',
}

export const CARD_W = 256
export const CARD_H = 356
