import { type ZoomNode } from './layout'

/**
 * Four ways of saying the same book, each roughly five times longer than the one
 * above it. That ratio is not decoration: a level's text has to grow about as
 * fast as the area it is given, or the level ends up either unreadably dense or
 * ballooning across the whole zoom range with nothing to hand off to.
 *
 * The chapter level is the last one written by hand. Below it lies Melville's
 * own text, which is why those nodes carry a chapter number instead of children.
 */

const WHOLE_BOOK =
	'Ishmael goes to sea on a whaler whose captain hunts the white whale that maimed him, and the whale kills them all but one.'

/** Six sentences that read, in order, as a single paragraph, each with a short name for the breadcrumb. */
const ACT_LABELS = [
	'Ashore',
	'The captain',
	'First hunts',
	'The whale in pieces',
	'Omens',
	'The chase',
]

const ACTS = [
	'Ishmael, restless and poor, goes down to New Bedford for a whaleship, shares a bed with the tattooed harpooneer Queequeg, and sails out of Nantucket on Christmas Day aboard the Pequod.',
	'Her captain stays below until he appears on one ivory leg, nails a gold doubloon to the mast, and swears the whole crew to hunt one particular white whale.',
	'The hunting begins in earnest, and the sea proves stranger than the errand: a hidden boat crew, a spirit-spout, a vast squid, and the first whale killed, cut in, and boiled down.',
	'Between hunts Ishmael takes the whale apart — brow, brain, skin, tail, fossils — while the ship drifts into the still centre of an armada and a cabin boy is left alone on the sea.',
	'Omens gather: a coffin built and refused, a harpoon baptized in blood, a smashed quadrant, fire at the mastheads, and a mate outside his captain’s door with a loaded musket.',
	'Ahab refuses a grieving father’s plea, sights Moby Dick, and chases him three days until the whale staves the ship and the line takes Ahab down, leaving Ishmael afloat on a coffin.',
]

/** Three per act, eighteen in all: about a page of prose when read together. */
const SECTIONS: Array<{ from: number; to: number; label: string; text: string }> = [
	{
		from: 1,
		label: 'A drizzly November',
		to: 6,
		text: 'Whenever it is a damp, drizzly November in his soul, Ishmael goes to sea, and this time as a whaleman. He tramps a frozen New Bedford, fetches up at the Spouter-Inn, and finds that the only bed left belongs to a tattooed cannibal who turns out to be the best companion he could have asked for.',
	},
	{
		from: 7,
		label: 'The chapel',
		to: 13,
		text: 'In the Whaleman’s Chapel he reads the tablets of men the sea kept, and hears Father Mapple preach Jonah from a pulpit shaped like a ship’s bow. He and Queequeg become bosom friends, talk in the dark, and take the packet for Nantucket, where Queequeg saves the life of a man who had mocked him.',
	},
	{
		from: 14,
		label: 'Nantucket',
		to: 22,
		text: 'On Nantucket, that heap of sand whose people overran the watery world, Queequeg’s idol chooses their ship. Ishmael signs aboard the Pequod, trimmed in whalebone, from Quaker owners who haggle over his lay and speak strangely of her captain. A beggar called Elijah hints at doom, and they sail on Christmas Day.',
	},
	{
		from: 23,
		label: 'Knights and squires',
		to: 27,
		text: 'Before the captain appears the book pauses to bury Bulkington, who would rather perish in the howling infinite than take the safety of land, and to argue that whaling is an honorable and world-opening trade. Then the mates: earnest Starbuck, easy Stubb, pugnacious Flask, and their three harpooneers.',
	},
	{
		from: 28,
		label: 'Ahab appears',
		to: 35,
		text: 'Ahab comes up at last, a bronze man with a livid scar and a leg of whale ivory socketed into the deck. He paces at night, throws away his pipe because it no longer soothes him, and keeps his table like a ceremony. Ishmael digresses on classifying whales and on the dreaminess of masthead watch.',
	},
	{
		from: 36,
		label: 'The oath',
		to: 47,
		text: 'On the quarter-deck Ahab nails a doubloon to the mast and binds the crew, over crossed lances and grog, to hunt the white whale that took his leg. Starbuck objects that vengeance on a dumb brute is blasphemy, and obeys anyway. Ishmael gives the legend of Moby Dick, and why whiteness appals above all colours.',
	},
	{
		from: 48,
		label: 'The first lowering',
		to: 54,
		text: 'The first lowering brings Ahab’s own hidden boat crew on deck under the shadowy Fedallah, and leaves Ishmael floating all night unnoticed. Ships are spoken and gams held, a spirit-spout leads them round the Cape, and the Town-Ho’s story is told, in which Moby Dick settles a shipboard quarrel by killing the tyrant.',
	},
	{
		from: 55,
		label: 'Brit and squid',
		to: 60,
		text: 'A long look at how badly whales have been drawn, how well, and where their shape turns up in teeth, wood, mountains and stars. Then the sea itself: meadows of brit, a vast white squid that frightens Starbuck worse than the whale would, and the whale-line coiled round every man in the boat.',
	},
	{
		from: 61,
		label: 'Cutting in',
		to: 73,
		text: 'Stubb kills a whale and eats a steak of it by lantern-light while sharks feed below. The blubber comes off in a spiral, the carcass is cast to the birds, the head is hung at the side for Ahab to interrogate. A mad prophet aboard the Jeroboam forbids the hunt, and Queequeg and Ishmael work tied together by a single rope.',
	},
	{
		from: 74,
		label: 'The two heads',
		to: 80,
		text: 'The two heads hang opposite one another and are read against each other, Stoic against Platonian. The battering brow, the great tun of spermaceti, Tashtego’s fall into the sinking head and Queequeg’s delivery of him, and the wrinkled forehead Ishmael tries and fails to read like a face.',
	},
	{
		from: 81,
		label: 'The grand armada',
		to: 92,
		text: 'Whaling is given ancient ancestors and Jonah a straight-faced defense. A German ship races them for a blind old bull with a stone lance already in him. In the Straits of Sunda the boats are drawn into the calm centre of a vast herd, among nursing cows, and Stubb tricks a French ship out of a fortune in ambergris.',
	},
	{
		from: 93,
		label: 'The castaway',
		to: 105,
		text: 'Little Pip jumps from the boat, is left alone on the immense sea, and comes back mad and wise. Ishmael, squeezing spermaceti back to fluid, feels a loving squeeze of universal good will and lowers his idea of happiness to the hearth. Then the try-works blaze at midnight, and he warns against staring too long into the fire.',
	},
	{
		from: 106,
		label: 'The coffin',
		to: 110,
		text: 'Ahab’s ivory leg had already wounded him once; a new one is made, and he quarrels with the carpenter over who owns his body. The casks are leaking, and when Starbuck presses him Ahab levels a musket, and is told to beware of Ahab. Queequeg, sick to death, has a coffin built and then decides to live.',
	},
	{
		from: 111,
		label: 'The forge',
		to: 119,
		text: 'In the Pacific, Perth the blacksmith forges Ahab a harpoon from racehorse nail-stubbs, tempered in the harpooneers’ blood and baptized in the devil’s name. A homeward ship heavy with oil invites them to rejoice and is refused. Fedallah prophesies two hearses and a death by hemp, and Ahab smashes the quadrant underfoot.',
	},
	{
		from: 120,
		label: 'The candles',
		to: 127,
		text: 'A typhoon sets the mastheads burning, and Ahab seizes the lightning links to defy the fire as his father and his foe. Starbuck stands outside the cabin with a loaded musket and cannot fire it. The compasses reverse and Ahab makes his own needle; the log-line parts; and Queequeg’s coffin is caulked into a life-buoy.',
	},
	{
		from: 128,
		label: 'The Rachel',
		to: 130,
		text: 'The Rachel has lost a boat with her captain’s son aboard, and he begs Ahab for two days of searching. Ahab hears only that she has met the white whale, and sails on. He orders Pip below, afraid the boy’s love will cure him of his purpose, and a sea-hawk carries off his hat.',
	},
	{
		from: 131,
		label: 'The symphony',
		to: 132,
		text: 'The Delight is burying a man Moby Dick killed, and her captain says the harpoon that can kill him is not yet forged. Next day, on a gentle blue sea, Ahab weeps into the water, tells Starbuck of forty years of whaling and of the young wife and child he left behind, and then turns away from him to Fedallah.',
	},
	{
		from: 133,
		label: 'Three days',
		to: 136,
		text: 'Ahab raises the whale himself and chases him three days. Boats are stove, Fedallah is carried off by the line, the ivory leg snaps. On the third day Moby Dick rises with Fedallah lashed to his back, staves the Pequod, and the running line takes Ahab by the neck as the ship goes down. Ishmael, thrown clear, floats on a coffin until the Rachel finds him.',
	},
]

/** Title and summary for each chapter, in order. Index 0 is chapter 1. */
const CHAPTERS: Array<[title: string, summary: string]> = [
	[
		'Loomings',
		'Whenever he finds himself grim about the mouth and pausing before coffin warehouses, Ishmael takes to the sea. He sails as a common sailor, never a passenger, for the pay and the pure air of the forecastle. He argues that all men feel water’s pull, and admits that what truly draws him is the overwhelming idea of the great whale itself.',
	],
	[
		'The Carpet-Bag',
		'Carrying his bag through a bitter New Bedford night, too poor for a good inn, Ishmael blunders into a black congregation where a preacher is thundering on damnation. He wanders on past dismal-looking lodgings and settles at last on the Spouter-Inn, kept by one Peter Coffin — a name he tries not to read as an omen.',
	],
	[
		'The Spouter-Inn',
		'The inn holds a murky, unreadable painting and a bar built from a whale’s jaw. Told the only bed left is half a harpooneer’s, Ishmael waits in mounting dread, hears the man is out selling a shrunken head, and finally meets him: the tattooed, tomahawk-smoking Queequeg. After a startled standoff he climbs in, and sleeps better than he has in years.',
	],
	[
		'The Counterpane',
		'Ishmael wakes locked in Queequeg’s affectionate arm, the harpooneer’s tattooed limb indistinguishable from the patchwork quilt. It recalls a childhood punishment when he lay terrified as a supernatural hand clasped his own. Freed at last, he watches Queequeg dress with grave, comic ceremony — hat and boots first, under the bed, then the rest.',
	],
	[
		'Breakfast',
		'The whalemen gather at table, and Ishmael expects sea-yarns and swagger. Instead they eat in bashful, awkward silence, these men who have faced whales in open boats going shy over the coffee. Only Queequeg is perfectly at ease, sitting coolly among them and reaching across the cloth with his harpoon to spear the beefsteaks.',
	],
	[
		'The Street',
		'New Bedford’s streets astonish a newcomer: actual cannibals lounging on corners, green Vermont farm boys fresh off the road, and Feegeeans, Tongatobooarrs and Brighggians all mixed together. Ishmael notes the wealth the fishery built — patrician houses, gardens and handsome women, every bit of it harpooned and dragged up out of the sea.',
	],
	[
		'The Chapel',
		'Before sailing, Ishmael sits in the Whaleman’s Chapel among silent widows and reads the marble tablets to men the sea never gave back — lost overboard, lost in a boat, lost off Japan. The grief in the room is dry-eyed and bottomless. He concludes that the body is not the man, and takes an odd comfort from it.',
	],
	[
		'The Pulpit',
		'Father Mapple arrives out of the sleet, a weathered old whaleman turned preacher. He climbs to his pulpit by a rope side-ladder and then, deliberately, hauls the ladder up after him, sealing himself off from the earth. The pulpit itself is built like a ship’s bow, with a scroll of painted canvas for its front.',
	],
	[
		'The Sermon',
		'Mapple preaches on Jonah: a man who fled his errand, was swallowed, and cried out of the belly of hell. He draws from it the hard doctrine of obedience to God and disobedience to oneself, and ends in a strange exultation — delight to the man who stands forth his own inexorable self against the proud gods and commodores of this earth.',
	],
	[
		'A Bosom Friend',
		'Back at the inn Ishmael finds Queequeg alone with his little black idol, and is struck by his calm self-sufficiency — no Christian civility, no hollowness. They smoke together, and Queequeg declares them married friends, pressing his forehead to Ishmael’s and splitting his money with him. Ishmael joins him in worshipping the idol, reasoning his way past his own Presbyterian scruples.',
	],
	[
		'Nightgown',
		'The two lie abed in the dark, talking comfortably, warm under the counterpane while the room is freezing. Ishmael decides that no man can be truly comfortable unless some small part of him is cold, since we know a thing only by contrast. They talk on late, wide awake and entirely at ease with one another.',
	],
	[
		'Biographical',
		'Queequeg tells his history: son of a king on the island of Kokovoko, a place not down in any map. He stowed away aboard a whaler to learn the arts of Christendom and make his people happier, only to find Christians miserable and wicked, and himself unfit to return. So he stayed at sea, and became a harpooneer.',
	],
	[
		'Wheelbarrow',
		'On the packet schooner to Nantucket a country bumpkin mimics Queequeg behind his back. Queequeg catches him, flings him somersaulting into the air by the waistband, and slaps him down. Minutes later the same man is knocked overboard by a swinging boom, and Queequeg goes in after him and hauls him out without comment.',
	],
	[
		'Nantucket',
		'A short rhapsody on the island itself: a bare elbow of sand, all beach and no hinterland, where they plant toadstools for shade and import weeds. Its people took to the water because the land offered nothing, and from that heap of sand they overran the watery two-thirds of the world like so many Alexanders.',
	],
	[
		'Chowder',
		'At the Try Pots, run by Hosea Hussey and his wife, supper is chowder and nothing but chowder — clam one meal, cod the next, small juicy morsels in butter and biscuit. It is superb, and it is relentless, served for breakfast, dinner and supper until Ishmael begins looking warily for bones in his food.',
	],
	[
		'The Ship',
		'Queequeg’s idol decrees that Ishmael must choose the ship alone. He picks the Pequod, an old vessel trimmed and fringed with whalebone, and is haggled aboard by the Quaker owners Peleg and Bildad — the one bluff and profane, the other piously stingy — for a miserable three-hundredth lay. They speak of a captain named Ahab, sick ashore and not to be seen.',
	],
	[
		'The Ramadan',
		'Queequeg shuts himself in for a day-long fast, and when the door will not open Ishmael panics and breaks in to find him squatting motionless with the idol on his head. Unable to rouse him, Ishmael waits the night out. Next morning he argues warmly against any religion that makes a man’s stomach his enemy.',
	],
	[
		'His Mark',
		'Peleg and Bildad balk at signing a pagan until Queequeg, asked to prove himself, spits on the deck, darts his harpoon across the water and cuts a drop of tar clean off a distant patch. He signs his mark without hesitation. Ishmael, arguing for him, enrols him in the First Congregational Church of the whole worshipping world.',
	],
	[
		'The Prophet',
		'A scarred, ragged stranger who calls himself Elijah stops the two on the wharf and asks whether they have signed with Old Thunder. He hints darkly at Ahab’s soul, the lost leg, a scrimmage off Cape Horn and a spitting into a silver calabash, then refuses to say another word and shambles off.',
	],
	[
		'All Astir',
		'For days the Pequod is fitted and stored, the owners carrying aboard bales and bundles, harpoons, hoops, casks, and a spare everything for a three years’ voyage. Peleg bustles, Bildad calculates, the crew is completed at three-and-thirty. Through all of it the captain is never once seen on deck.',
	],
	[
		'Going Aboard',
		'Before dawn Ishmael and Queequeg walk down to the ship through fog. Elijah appears again with a parting jeer about shadowy figures who went aboard in the dark and were never seen coming off. On board they find a sleeping rigger and no officers; slowly the ship wakes, and the grey morning comes on.',
	],
	[
		'Merry Christmas',
		'On Christmas Day the Pequod is warped out through the ice. Peleg and Bildad pilot her past the breakwater, bullying and blessing the crew by turns, and then, at the last moment, drop over the side into their boat weeping. The ship is left to the wintry Atlantic, her course set by a captain nobody has laid eyes on.',
	],
	[
		'The Lee Shore',
		'A short chapter for Bulkington, the tall silent helmsman just home from a four years’ voyage who has shipped out again at once. Ishmael turns his choice into an emblem: for a ship in a storm the land is the danger, not the refuge. Better to perish in that howling infinite than be ingloriously dashed upon the lee.',
	],
	[
		'The Advocate',
		'Ishmael takes up the defense of his trade against landsmen who think it butchery and the whaleman no gentleman. He points to the commerce whaling feeds, the Pacific islands and coastlines it opened, the wars it helped settle, and the plain fact that a butcher with a battlefield behind him is honoured while a butcher with a whale is not.',
	],
	[
		'Postscript',
		'A brief coda to the defense, on the anointing of kings. Whatever oil is used at a coronation, the best is spermaceti, drawn from the head of the whale. So royalty itself is crowned by the fishery, and the whaleman may claim a hand in every anointed head in Europe.',
	],
	[
		'Knights and Squires',
		'Starbuck, the chief mate, a lean and enduring Nantucket Quaker, careful and brave in a strictly rational way. He will have no man in his boat who is not afraid of a whale, holding that an utterly fearless man is a far more dangerous comrade than a coward. Ishmael pauses to claim dignity for such common men.',
	],
	[
		'Knights and Squires',
		'Stubb, the second mate, easy and fearless behind an everlasting pipe, humming through peril as though it were dinner; and Flask, the third, a short pugnacious man who regards whales as so many water-rats to be exterminated. Each has his harpooneer: Queequeg to Starbuck, Tashtego the Gay Head Indian to Stubb, and the huge African Daggoo to Flask.',
	],
	[
		'Ahab',
		'Days out, Ahab at last stands upon the quarter-deck. He is a man cast in bronze, with a livid white seam running down from his hair through his face and neck, and a leg of polished whale-jaw braced into an auger hole bored in the planks. He says nothing, and the mood of the ship changes around him.',
	],
	[
		'Enter Ahab; to Him, Stubb',
		'Ahab takes to pacing the deck at night, his ivory heel knocking above the sleeping crew. Stubb, sent up to suggest he might muffle it, is called a dog, a donkey, a mule and an ass and driven below. Shaken, Stubb decides the insult was somehow an honour, and goes back to his hammock to dream about it.',
	],
	[
		'The Pipe',
		'Ahab sits on his ivory stool and lights the pipe he has smoked for years. It no longer soothes him; smoking, he thinks, is for quiet men with white hair, and he is neither quiet nor at peace. He knocks out the ashes and flings the still-burning pipe into the sea.',
	],
	[
		'Queen Mab',
		'Stubb tells Flask his dream. Ahab kicked him with the ivory leg, and when he tried to kick back a merman with a hump like a hand-basket told him to take it as a mark of honour: better to be kicked by a king’s ivory than struck by a common foot. Stubb wakes half convinced.',
	],
	[
		'Cetology',
		'Ishmael attempts a classification of whales, insisting first that the whale is a fish, and sorting them by book sizes — Folio, Octavo and Duodecimo — with chapters for the Sperm Whale, Right Whale, Narwhal, Killer and the rest. He leaves the system frankly incomplete, calling it the draught of a draught, to be finished by other hands.',
	],
	[
		'The Specksnyder',
		'On the old Dutch division of command between captain and chief harpooneer, and on how authority at sea is maintained. Ahab holds absolute power, but Ishmael notes that even absolute power needs forms, observances and a certain distance to work upon men, and that Ahab is careful to keep them.',
	],
	[
		'The Cabin-Table',
		'Dinner in the cabin is a silent, joyless ceremony: the mates enter in strict order of rank, help themselves under Ahab’s eye, and eat without a word, Flask hungriest and last. When they are done the harpooneers take the table, and eat with a barbaric ease and appetite that makes the steward tremble.',
	],
	[
		'The Mast-Head',
		'Ishmael describes the long, idle hours of standing lookout a hundred feet up. He warns shipowners against romantic young men: the dreamy pantheist aloft loses his identity in the blue, takes the sea for the visible image of his own soul, and may at any moment slip his hold and drop through transparent air into it.',
	],
	[
		'The Quarter-Deck',
		'Ahab calls all hands, nails a Spanish gold doubloon to the mainmast for whoever first raises a white-headed whale with a wrinkled brow and a crooked jaw, and reveals the hunt. He fills the harpooneers’ iron sockets with grog and binds the crew in a drinking oath. Starbuck protests that vengeance on a dumb brute is blasphemy, and is overborne.',
	],
	[
		'Sunset',
		'Ahab alone in the cabin at the stern windows. He speaks of the crown he wears and the pain in it, of the forty years of hardship behind him, and of a purpose he cannot now unwill: the path to it is laid with iron rails, and his soul is grooved to run on them. He names himself madness maddened.',
	],
	[
		'Dusk',
		'Starbuck, leaning on the mainmast, knows exactly what he has just sworn to. He sees the whole voyage foreshortened into horror, understands that his duty binds him to obey a man he believes damned, and finds in himself no way out. He hears the crew’s revelry forward and can only wait.',
	],
	[
		'First Night-Watch',
		'Stubb, alone on the forecastle, turns the thing over and arrives at his own philosophy. Whatever is coming is fixed and none of his doing, so the only sane response is laughter. A laugh, he decides, is the wisest and easiest answer to all that is queer, and he sings himself off to his watch.',
	],
	[
		'Midnight, Forecastle',
		'The crew carouse in a babble of nations — Nantucketer, Dutch, French, Icelander, Maltese, Sicilian, Chinese, Lascar, Tahitian — dancing, boasting and singing. A quarrel flares between the Spanish sailor and Daggoo and nearly becomes a knife-fight as a squall rises and all hands are called. Little Pip, left behind, prays to be spared.',
	],
	[
		'Moby Dick',
		'Ishmael gives the legend. Whalemen tell of a white-headed sperm whale of unexampled size and malice, met in widely separated seas at nearly the same hour, so that some hold him ubiquitous and immortal. It was he who reaped away Ahab’s leg in a maddened moment, and on him Ahab has piled all his rage and hate since Adam.',
	],
	[
		'The Whiteness of the Whale',
		'Ishmael tries to explain why the whale’s whiteness is what appals him most. Whiteness confers beauty and holiness, yet also haunts — the polar bear, the white shark, the shrouded dead. He concludes it is the colourless all-colour of atheism, a dumb blankness full of meaning, and that all other colours are only cunning laid on from without.',
	],
	[
		'Hark!',
		'On the night watch, Cabaco and Archy whisper by the main hatches. Archy is certain he has heard a cough and a stirring below, where no one is berthed. Cabaco tells him he imagines it and to hold his tongue, but Archy insists that something living is down there in the after-hold.',
	],
	[
		'The Chart',
		'By lamplight in his cabin Ahab spreads yellowed charts and rules lines across them, cross-referencing logbooks and the seasons of the sperm whale’s feeding grounds to predict where his quarry must be and when. The work is patient and rational. Night after night he starts out of his hammock with a shriek, his own purpose driving him out of sleep.',
	],
	[
		'The Affidavit',
		'Anticipating disbelief, Ishmael assembles evidence: whales recognised and named by whalemen, harpoons found in bodies years later, the Essex stove and sunk by a whale, the Union, the Pusie Hall. He insists he is not writing a fable, and that the reader who thinks a whale cannot destroy a ship knows nothing of the matter.',
	],
	[
		'Surmises',
		'Ahab reasons coldly about his crew. Their loyalty is bought with the ordinary motives of profit and habit, not with his private hatred, and a captain who openly subordinates the voyage to one whale invites mutiny. So he resolves to keep hunting whales generally, and to hold his real errand in reserve.',
	],
	[
		'The Mat-Maker',
		'Ishmael and Queequeg weave a sword-mat in a drowsy calm, and the work becomes an emblem: the fixed warp as necessity, his own shuttle as free will, and Queequeg’s careless sword-blow as chance, the three woven together. The reverie is cut short by Tashtego’s cry from aloft — there she blows.',
	],
	[
		'The First Lowering',
		'As the boats go down, five dusky phantoms appear from below around a tall figure in black, Fedallah: Ahab’s own crew, smuggled aboard. In the squall that follows Starbuck’s boat is swamped, its lantern burning over the water, and Ishmael floats all night in the wreck until dawn, nearly run down by the Pequod herself.',
	],
	[
		'The Hyena',
		'Half-drowned and philosophical, Ishmael decides there are times when a man takes the whole universe for a vast practical joke at his own expense. He goes below, makes his will with Queequeg’s help, feels remarkably easy about it, and reflects that he has now survived his own death and is living on velvet.',
	],
	[
		'Ahab’s Boat and Crew. Fedallah',
		'Ishmael explains the mystery of the extra crew: it is not unheard of for a captain to keep a boat of his own, and Ahab, one-legged and driven, meant from the first to lower after Moby Dick himself. Fedallah remains unexplained, a shadow out of the older East whom the crew watch with dread.',
	],
	[
		'The Spirit-Spout',
		'Night after moonlit night a single silvery jet is raised far ahead, always at the same hour, never overtaken. The crew half believe it is Moby Dick luring them on. It draws the ship down past the Cape of Good Hope through black and malicious seas, and Ahab keeps the course.',
	],
	[
		'The Albatross',
		'They speak the Goney, a whaler so long at sea that she is bleached white and her crew look like ghosts. Ahab hails her to ask after the white whale, but as her captain raises his trumpet it drops from his hand into the sea, and the ships pass on the wind without exchanging a word.',
	],
	[
		'The Gam',
		'A digression on the gam, the social meeting of two whaleships at sea, in which captains visit and crews swap letters and news. Ishmael defines it with mock-lexicographical gravity and notes how much of the ocean’s intelligence travels this way — and how little use Ahab now has for any of it.',
	],
	[
		'The Town-Ho’s Story',
		'A tale within the tale, as Ishmael told it years later in Lima. Aboard the Town-Ho the brutal mate Radney torments the sailor Steelkilt until mutiny and flogging follow, and Steelkilt swears to kill him. Then Moby Dick appears, and takes Radney out of the boat in his jaws, sparing Steelkilt the deed.',
	],
	[
		'Of the Monstrous Pictures of Whales',
		'A survey of how wrong the pictures are: Hindu and Egyptian carvings, an unrecognisable creature in a Dorsetshire church, French plates, English broadsides and London shop signs, all giving the whale the shape of a squashed sausage or a stranded ship. Ishmael concludes that the living whale cannot be drawn, and must be met to be known.',
	],
	[
		'Of the Less Erroneous Pictures of Whales',
		'The honourable exceptions. Ishmael praises a handful of French engravings of whaling scenes, some Dutch and English plates, and Garnery above all, as the only pictures that convey the tumult and truth of a lowered boat. Even these, he allows, are a poor substitute for the thing itself.',
	],
	[
		'Of Whales in Paint; in Teeth; in Wood',
		'Whales turn up scrimshawed on teeth by idle sailors, carved in wood and bone, cast in iron, and traced out in mountain ridges and in the stars. Ishmael, having looked long enough, finds the leviathan shape everywhere in the world, and suspects that whoever has not been at sea will never see it at all.',
	],
	[
		'Brit',
		'The Pequod sails through endless yellow meadows of brit, the minute food of right whales, which mow through it in long rows. The sight sets Ishmael on the sea’s two faces: its gentleness above and its universal cannibalism beneath, and the warning that each of us keeps an insular Tahiti within, encompassed by horror.',
	],
	[
		'Squid',
		'In a dead calm a vast creamy white mass rises from the sea, furlongs across, with innumerable long arms radiating and curling like a nest of anacondas. It sinks again without a sound. Starbuck says he would almost rather have seen Moby Dick, for few ships that sight the great squid ever return to port.',
	],
	[
		'The Line',
		'A description of the whale-line: hemp, faintly tarred, coiled in the tub with exact care so it may run out freely, and passing round every man in the boat. Ishmael turns it into a figure — all mortals live enveloped in such lines, and it is only when they are running that the peril is seen.',
	],
	[
		'Stubb Kills a Whale',
		'Queequeg raises a sperm whale from the masthead and the boats go down. Stubb steers his own with easy, obscene encouragement, smoking all the while, until the harpoon is fast. Then he plies the lance at close quarters, feeling for the life, until the whale spouts thick red blood, flurries, and rolls over dead.',
	],
	[
		'The Dart',
		'On the working of the harpoon, and on a fault in the trade. The harpooneer must row himself breathless in the chase and then, at the exact moment, spring up and dart with all his strength. Ishmael argues it is no wonder so many whales are missed, and that the man should be rested for the throw.',
	],
	[
		'The Crotch',
		'A short technical chapter on the crotch, the notched stick in the boat’s bow that holds the second harpoon ready. Since both irons are darted at once but only one is usually fast, the loose iron and its line whip about the boat, and Ishmael notes the ugly danger of it.',
	],
	[
		'Stubb’s Supper',
		'The dead whale is made fast alongside. Stubb orders a steak cut from its small and eats it rare by lantern-light on deck while thousands of sharks feed on the same carcass below. He bullies old Fleece the cook into preaching a sermon to the sharks, which the old man delivers with weary contempt.',
	],
	[
		'The Whale as a Dish',
		'On eating whale — the rich fritters, the brains, the balls of the sperm whale — and on the oddity of a man dining on a creature by the light of its own oil. Ishmael answers the charge of cannibalism by observing that who is not a cannibal, who eats a fatted ox and damns a Fejee.',
	],
	[
		'The Shark Massacre',
		'Through the night the sharks swarm so thickly about the carcass that the men must beat them off with whaling-spades over the side. The slaughter is indiscriminate and horrible, and a shark half-flensed and apparently dead snaps shut on Queequeg’s hand as he stoops to it.',
	],
	[
		'Cutting In',
		'The work of stripping the whale: the blubber-hook driven into a hole cut in the flank, the tackles manned at the windlass, and the whole ship careening as the blubber peels away in one continuous spiral blanket-piece, like the skin of an orange, while the carcass revolves in the water.',
	],
	[
		'The Blanket',
		'On the whale’s skin — hieroglyphically marked, thin as paper over the vast blubber beneath — which keeps him at an even temperature in polar ice and equatorial calm alike. Ishmael draws the moral: be thou, oh man, like the whale, warm among the icebergs and living in the world without being of it.',
	],
	[
		'The Funeral',
		'The stripped white carcass is cut loose and floats away, mobbed by sharks below and screaming fowl above, a ghastly mass turning in the ship’s wake. Sailors in distant vessels mistake it for rocks and shoals and mark it on their charts, and the error is copied for years after.',
	],
	[
		'The Sphynx',
		'With the great severed head hanging at the side, Ahab comes to it alone in the stillness of noon and speaks. He calls it the greatest of witnesses, which has seen drowned sailors and lost ships in the deepest sea, and commands it to speak and tell the secret thing that is in it. The head says nothing.',
	],
	[
		'The Jeroboam’s Story',
		'The Jeroboam comes down on them with an epidemic aboard, her captain unable to board. She carries a Shaker prophet named Gabriel who has proclaimed Moby Dick the Shaker God incarnate, forbidden the hunt, and been obeyed after the mate who lowered was killed. Gabriel shouts warnings of blasphemy at Ahab across the water.',
	],
	[
		'The Monkey-Rope',
		'Queequeg goes down onto the floating carcass to plant the blubber-hook, tied to Ishmael by the monkey-rope so that if one goes both go. Ishmael finds his own free will mortally wounded by the arrangement, and reflects that another man’s mistake may drown you — a thing true of banks, doctors and everyone else.',
	],
	[
		'Stubb and Flask Kill a Right Whale',
		'Ahab orders a right whale taken as well, since an old Dutch superstition holds that a ship with a sperm whale’s head on one side and a right whale’s on the other cannot capsize. Stubb and Flask kill it, joking as they go, and afterwards whisper together about Fedallah, whom Stubb takes for the devil in disguise.',
	],
	[
		'The Sperm Whale’s Head—Contrasted View',
		'A close reading of the sperm whale’s head: the great battering wall of the brow, the tiny eyes set at opposite ends so that he must see two distinct pictures and nothing straight ahead, the ears no bigger than a quill, and the vast white chamber of the mouth with its ivory teeth and delicate lower jaw.',
	],
	[
		'The Right Whale’s Head—Contrasted View',
		'The right whale’s head hauled up opposite: the bone-screened mouth with its hundreds of slats of whalebone, the immense lipped grin, the crown pit on top. Ishmael sets the two heads against each other and reads them as philosophies — the right whale a Stoic, the sperm whale a Platonian of the later years.',
	],
	[
		'The Battering-Ram',
		'On the front of the sperm whale’s head: a dead, blind wall without a single organ or protuberance, elastic and thickly padded, and behind it nothing but oil and tissue. It is a mighty and wonderful concentration of ram, and Ishmael tells the reader who cannot credit it to believe, and be sceptical of nothing.',
	],
	[
		'The Great Heidelburgh Tun',
		'The upper chamber of the head, the case, is a great cistern holding the finest spermaceti, clear and pure, worth more than all the rest of the oil. Ishmael likens it to the enormous wine tun of Heidelberg, and describes the ceremony with which it is opened and drawn off.',
	],
	[
		'Cistern and Buckets',
		'Tashtego, lowering buckets into the case, slips and falls headlong into the head, which at that moment tears free of its tackles and drops into the sea. Queequeg goes over the side with a sword, cuts an opening in the sinking head, reaches in, and delivers Tashtego by the hair like a midwife.',
	],
	[
		'The Prairie',
		'Ishmael attempts to read the sperm whale’s brow as a physiognomist would read a face. He finds a broad, unmarked expanse of dignity, a pyramidical silence, and wrinkles that may be genius or may be nothing. He admits defeat: the face is undecipherable, and he can only say that it is sublime.',
	],
	[
		'The Nut',
		'Beneath that vast brow the actual brain is astonishingly small, hidden far back and buried in bone and spermaceti. Turning phrenologist, Ishmael proposes instead to read the whale’s spine, and argues that a man’s backbone deserves quite as much reverence as his skull, since character lives along it.',
	],
	[
		'The Pequod Meets The Virgin',
		'The German ship Jungfrau comes begging for oil, having taken none. Both ships then race their boats for a school of whales and take an old, blind, crippled bull who sinks after he is killed, carrying the irons down. In his flesh they find a stone lance-head, a wound generations old.',
	],
	[
		'The Honor and Glory of Whaling',
		'Ishmael enrols a distinguished ancestry for the trade: Perseus rescuing Andromeda from a sea-monster is the first whaleman, and after him Hercules, Jonah, Vishnu in his fish avatar, and St. George, whose dragon he insists was a whale. The fishery is thus an ancient and honourable guild, and he is proud to be of it.',
	],
	[
		'Jonah Historically Regarded',
		'Objections to the Jonah story are answered with a straight face — that a whale’s throat is too narrow, that the Mediterranean holds no sperm whales, that Jonah could not have reached Nineveh in the time. Ishmael disposes of each with grave scholarship and evident enjoyment, and declines to give up the miracle.',
	],
	[
		'Pitchpoling',
		'A description of pitchpoling, in which the long light lance is darted at a running whale from a distance and hauled back by its warp for another throw. Stubb is the master of it, standing in the pitching bow and sending the lance quivering into the whale again and again as the boat is towed along.',
	],
	[
		'The Fountain',
		'On the spout: whether it is water or vapour, how the whale breathes only at intervals and must spend a fixed part of his life at the surface, and how a jet of it will blister the skin. Ishmael decides it is mist, and takes it as an emblem of the doubt and mistiness that attend all deep, earnest thinking.',
	],
	[
		'The Tail',
		'The flukes, twenty feet across and layered like a plaited carpet, capable of flinging a boat into the air and of the most delicate gentleness. Ishmael catalogues their five motions and confesses that the gestures of the tail remain a language he cannot read: I know him not, and never will.',
	],
	[
		'The Grand Armada',
		'In the Straits of Sunda the Pequod chases an immense herd, is herself chased by Malay pirates, and breaks into the mass. Queequeg’s boat is drawn into the enchanted calm at its centre, where cows nurse their young and newborn whales gaze up through the clear water, while the outer ring thunders round them.',
	],
	[
		'Schools and Schoolmasters',
		'On the two kinds of whale society: harems of cows shepherded by a single lord, who fights off rivals and abandons the school when his vigour fails; and schools of young males who roam together, spendthrift and quarrelsome, until age scatters them into solitude. Ishmael draws the obvious human parallels with relish.',
	],
	[
		'Fast-Fish and Loose-Fish',
		'The whole law of whaling possession reduces to two articles: a fast-fish belongs to whoever is attached to it, a loose-fish is fair game for anybody. Ishmael extends the principle outward to mortgaged farms, salvaged ships, colonies, the rights of man, and the reader’s own opinions, until it swallows the world.',
	],
	[
		'Heads or Tails',
		'An old English law grants the king the head and the queen the tail of any whale taken on that coast. Ishmael recounts the case of poor fishermen robbed of their catch by the Lord Warden on this ground, and enjoys the absurdity of a statute that divides a whale between two royal persons.',
	],
	[
		'The Pequod Meets The Rose-Bud',
		'A French ship has two blasted whales alongside, stinking and worthless, and her crew are sickening. Stubb, seeing his chance, persuades the captain through a mocking interpreter that the carcasses are deadly, gets them cast off, and cuts into the smaller one to bring up a fortune in ambergris.',
	],
	[
		'Ambergris',
		'On ambergris itself: a soft, waxy, sweet-smelling substance found in the bowels of a diseased whale, worth a gold guinea an ounce, and used in perfumery, pastilles and wine. Ishmael relishes the paradox that the finest fragrance in the world is dug out of corruption, and defends the whale against the charge of being unsavoury.',
	],
	[
		'The Castaway',
		'Little Pip, the Alabama cabin boy, is put into a boat and jumps in fright when the line is fast, twice. The second time Stubb leaves him, and Pip floats alone on the vast sea until picked up. His body is saved and his reason drowned; thereafter he talks with the idiot wisdom of heaven.',
	],
	[
		'A Squeeze of the Hand',
		'The cooled spermaceti must be squeezed back to fluid by hand. The work is so sweet and unctuous that Ishmael falls into a rapture, squeezing his shipmates’ hands in the tub and feeling a strange loving good will toward them all. He resolves to lower his conceit of attainable felicity to the wife, the heart, the bed and the fireside.',
	],
	[
		'The Cassock',
		'A brief and deadpan chapter on the mincer, who dresses himself in the black pelt of the whale’s huge organ — cut, stripped and hung to dry — and stands at his block in that vestment slicing the blubber into leaves for the pots, a candidate for an archbishoprick.',
	],
	[
		'The Try-Works',
		'At midnight the brick furnaces blaze on deck, the pagan harpooneers feeding them with the whale’s own crisped scraps, the ship driving on through the dark like something damned. Ishmael, at the helm and hypnotised by the fire, turns about and nearly capsizes her. He warns against staring too long into the flame.',
	],
	[
		'The Lamp',
		'A short, warm chapter on light. Merchant sailors grope below in darkness, but the whaleman lives in illumination, drawing his oil straight from the cask and burning it fresh and unadulterated, so that the forecastle at night is as bright as a bridegroom’s chamber.',
	],
	[
		'Stowing Down and Clearing Up',
		'After the trying-out, the oil is casked and struck below and the ship is scoured from deck to rigging until she is spotless and the men are dressing for a quiet evening. At that precise moment the cry comes down from the masthead — there she blows — and the whole filthy business begins again.',
	],
	[
		'The Doubloon',
		'The gold coin on the mainmast, stamped with three Andes summits, a flame, a tower and a crowing cock, is read in turn by everyone aboard. Ahab finds himself in all three peaks, Starbuck a warning, Stubb a joke out of the almanac, Flask so many cigars, and Pip conjugates the verb: I look, you look, he looks.',
	],
	[
		'Leg and Arm',
		'The English whaler Samuel Enderby heaves to, her captain Boomer sporting a whalebone arm lost to Moby Dick. He tells the story cheerfully and says he means to leave the whale alone in future — he has enough trouble. Ahab, hearing only where the whale was last seen, breaks off the gam and makes sail.',
	],
	[
		'The Decanter',
		'A digression on the Enderby house of London and the hospitality of English whaleships, with an inventory of their generous provisioning, and a memory of a grand gam aboard a Dutch whaler with its enormous supply of butter and cheese. Ishmael contrasts it with the plainer Yankee style.',
	],
	[
		'A Bower in the Arsacides',
		'Ishmael recalls measuring a whale skeleton in the Arsacides, where the islanders had laid it up as a temple, green with creepers and hung with trophies, a priest tending the smoke of its jaw. The vines running through the bones become an image of the loom on which life and death weave together.',
	],
	[
		'Measurement of The Whale’s Skeleton',
		'The bare dimensions, given with the pride of a man who took them himself: the length of the skeleton, the ribs, the vertebrae diminishing to a ball of bone at the tip. Ishmael notes that he had the figures tattooed on his right arm, there being no other safe place to keep them.',
	],
	[
		'The Fossil Whale',
		'The whale in the strata: bones quarried from Alabama hillsides and the base of the Alps, remains older than the Pyramids, a creature contemporary with the beginnings of the world. Ishmael writes himself into a kind of awe, declaring the leviathan a subject of whom it is not possible to write a small book.',
	],
	[
		'Does the Whale’s Magnitude Diminish?',
		'Against the claim that whales are smaller than they used to be and hunted toward extinction, Ishmael argues that the old accounts are exaggerations, that the herds have merely grown wary and congregated, and that the whale, having outlasted so much, will outlast man as well and spout his frothed defiance at the sky.',
	],
	[
		'Ahab’s Leg',
		'It emerges that before the Pequod sailed Ahab had been found insensible on the ground, his ivory leg having splintered and stabbed him nearly through. A new one is made at sea from a sperm whale’s jaw. Ishmael broods on the private agonies behind that reticence, and on the woe that is madness.',
	],
	[
		'The Carpenter',
		'A portrait of the ship’s carpenter, who can make or mend anything — a leg, a tooth, a plug, a coffin — with the same unvarying, impersonal competence. He is not stupid exactly, but unthinking, a manual dexterity without a self behind it, and Ishmael studies him as a kind of specimen.',
	],
	[
		'Ahab and the Carpenter',
		'Standing over the carpenter at his vice, Ahab rails at him for a blockhead, demands his new leg, and falls to brooding aloud on the phantom limb he still feels. He wonders who owns his body, what a man is that outlives his parts, and leaves the carpenter muttering that the old man is queer.',
	],
	[
		'Ahab and Starbuck in the Cabin',
		'Oil casks are leaking in the hold, and Starbuck comes to ask that the ship heave to and break them out. Ahab refuses; when Starbuck presses, he snatches a loaded musket and levels it at his mate. Starbuck answers only that Ahab should beware of Ahab, and goes, and Ahab gives the order himself.',
	],
	[
		'Queequeg in His Coffin',
		'Queequeg catches a fever in the damp hold and wastes almost to nothing. Certain he will die, he asks for a canoe-coffin, has it made, tries it for size, and lies in it with his harpoon and his little god. Then he remembers a duty ashore, decides not to die, and recovers — and carves the coffin lid with his tattoos.',
	],
	[
		'The Pacific',
		'The Pequod passes at last into the Pacific, and Ishmael salutes that serene and mysterious ocean, the tide-beating heart of the earth, rolling over the graves of all the world’s dead. Ahab, standing at the bow, feels none of it: he knows only that Moby Dick swims in this water.',
	],
	[
		'The Blacksmith',
		'Perth the blacksmith, deaf and shuffling, once had a wife, a house and children, and lost all three to drink and a burglar’s winter night. Death would not have him, so he went to sea at sixty, and works his forge with the calm of a man who has already lost everything he could lose.',
	],
	[
		'The Forge',
		'Ahab brings Perth a bag of racehorse nail-stubbs to forge into a harpoon that will hold. He welds the rods himself, has the barbs tempered not in water but in the blood of the three harpooneers, and baptizes the iron in the devil’s name rather than the Father’s, laughing at the sound of his own voice.',
	],
	[
		'The Gilder',
		'Long golden days of gentle weather come on, and the sea seems a meadow. Ahab, Starbuck and Stubb each speak in turn out of the calm — Ahab on the round of life’s moods from doubt to faith and back, Starbuck on trusting the fair sky, Stubb on laughing at both.',
	],
	[
		'The Pequod Meets The Bachelor',
		'A Nantucket ship comes down homeward-bound, full to the hatches with oil, her crew dancing on deck with Polynesian girls and her captain jubilant. He has never seen Moby Dick and does not believe in him, and invites Ahab aboard to celebrate. Ahab refuses, and the two ships stand away on opposite courses.',
	],
	[
		'The Dying Whale',
		'The Pequod takes four whales in a day. Ahab watches one of them turn its head toward the setting sun as it dies, and speaks aloud to it of the sun-worship in himself, of the fire that will not be conquered, and of the strange devotion the dying creature pays to the light.',
	],
	[
		'The Whale Watch',
		'Watching the dead whale in the night, Ahab and Fedallah speak. Fedallah prophesies that Ahab shall see two hearses before he dies, the first not made by mortal hands and the second of American wood; that Fedallah shall go before him as his pilot; and that only hemp can kill him. Ahab takes it for immortality.',
	],
	[
		'The Quadrant',
		'At noon Ahab takes the sun’s altitude and learns his own latitude. Enraged that the instrument can tell him where he is and not where the whale is, he denounces all such science as vanity, dashes the quadrant to the deck and stamps it to pieces, and vows to steer by compass and log alone.',
	],
	[
		'The Candles',
		'A typhoon strikes off Japan and corpusants burn white at the three mastheads. The crew fall back in terror and Starbuck reads a warning in it. Ahab plants his ivory foot on Fedallah, seizes the lightning-rod links, and defies the clear spirit of clear fire as his father and his fiery foe, the flame flaring in his face.',
	],
	[
		'The Deck Towards the End of the First Night Watch',
		'In the wreck of the storm Starbuck asks leave to strike sail and let the ship run before the wind. Ahab refuses and orders the topsails lashed down harder, insisting the wind that drives him on will not turn him aside. The men work aloft in the dark and the ship drives on.',
	],
	[
		'Midnight.—The Forecastle Bulwarks',
		'Stubb and Flask work at securing the anchors while the storm blows itself out, and fall to arguing about lightning rods — whether a ship should trail one overboard in a squall, and whether it is not impious to try to fend off heaven’s fire. Stubb keeps his temper and his joke.',
	],
	[
		'Midnight Aloft.—Thunder and Lightning',
		'Tashtego, at work on the main-topsail yard with thunder cracking around him, offers his own brief opinion on the weather. He wants no thunder at all, having no use for it, and would rather have rum; a man needs a great deal of it to be religious in that noise.',
	],
	[
		'The Musket',
		'The storm has passed. Starbuck, going below to report, sees the loaded muskets in the rack outside Ahab’s door and takes one up. He argues with himself — that Ahab will drown the whole crew, that this would be no murder but prevention — and cannot do it. He lowers the musket and goes to give the order.',
	],
	[
		'The Needle',
		'The lightning has reversed the compass needles, and the ship has been sailing the wrong way since dawn. Ahab, exulting in the crew’s dismay, makes a new needle himself from a lance, a sail-needle and a bit of linen thread, magnetises it, and sets it swinging, calling himself lord of the level loadstone.',
	],
	[
		'The Log and Line',
		'The log-line, long unused and rotted by weather, snaps and is lost overboard, and Ahab cries that he can mend all things but himself. Pip comes wandering up talking his beautiful nonsense about the lost boy, and Ahab, unexpectedly moved, takes the boy by the hand and leads him below to his own cabin.',
	],
	[
		'The Life-Buoy',
		'Nearing the grounds, they pass a ship’s wake and hear cries in the night. A man falls from the masthead next morning and is lost. The life-buoy cask, long hanging in the sun, is shrunken and useless, and after some argument Queequeg’s coffin is caulked, pitched and hoisted in its place.',
	],
	[
		'The Deck',
		'The carpenter sets about converting the coffin, plugging its seams and fitting it with lines, grumbling at the work. Ahab comes on deck, watches, and turns it over bitterly in his mind — a life-buoy made of a coffin, an immortality made of death — and sends the carpenter off to make him a new log-line.',
	],
	[
		'The Pequod Meets The Rachel',
		'The Rachel has met Moby Dick the day before, and in the chase lost a whole boat’s crew, among them the captain’s twelve-year-old son. Her captain comes aboard and begs Ahab, as a fellow Nantucketer and a father, to charter the Pequod for forty-eight hours of searching. Ahab refuses and orders sail made at once.',
	],
	[
		'The Cabin',
		'Pip wants to follow Ahab everywhere and be his leg. Ahab, who feels the boy curing him, forbids it: there is that in Pip’s touch which is too much like healing, and he cannot afford to be made whole now. He orders Pip to stay below in the cabin and not come on deck.',
	],
	[
		'The Hat',
		'Ahab now scarcely leaves the deck at all, and takes the first masthead watch himself, hoisted aloft in a basket. As he sways there scanning the sea, a black sea-hawk that has been circling the mainmast darts at his head, snatches the hat from it, and carries it away out of sight, dropping it far off into the sea.',
	],
	[
		'The Pequod Meets The Delight',
		'A battered ship comes down with a wrecked whaleboat hanging in her rigging and five men to bury. Her captain says Moby Dick did it, and that the harpoon which can kill him is not yet forged. As the Pequod draws away he sees her coffin life-buoy at the stern, and the dead man is dropped into the sea behind them.',
	],
	[
		'The Symphony',
		'A clear blue day, the air feminine and the sea masculine. Ahab leans over the rail and drops a tear into the ocean, and tells Starbuck of forty years of whaling, of the wife he married past fifty and the child he hardly knows. Starbuck begs him to turn for Nantucket. Ahab asks what nameless thing commands him, and turns away to Fedallah.',
	],
	[
		'The Chase—First Day',
		'Ahab himself, aloft in his basket, raises the white hump. The boats go down and Moby Dick takes Ahab’s in his jaws, holds it, and bites it in two. Ahab is spilled into the sea and circled by the whale until the Pequod drives him off. Picked up and counted over, he is undaunted and orders the chase resumed.',
	],
	[
		'The Chase—Second Day',
		'The whale is raised again and all three boats attack. Moby Dick tangles the lines, smashes two boats together and hurls the third aside; when Ahab is hauled up it is found that Fedallah is gone, dragged down by the line, and that the ivory leg is snapped off at the knee. Starbuck begs him to stop. Ahab refuses.',
	],
	[
		'The Chase—Third Day',
		'On the third day the whale rises with Fedallah’s corpse lashed to his back by the turns of the lines — the first hearse. Moby Dick charges the ship and staves in her bow. Ahab darts his iron, the running line catches him round the neck and takes him soundlessly out of the boat, and the Pequod goes down, dragging boats, men and a sky-hawk with her.',
	],
	[
		'Epilogue',
		'One survived. Ishmael, pitched from Ahab’s boat and floating at the edge of the vortex, is drawn to the centre as the ship sinks, where Queequeg’s coffin life-buoy shoots up beside him. He floats on it a day and a night, unmolested by sharks, until the Rachel, still cruising for her own lost children, finds another orphan.',
	],
]

export const book: ZoomNode = {
	id: 'book',
	text: WHOLE_BOOK,
	children: ACTS.map((act, actIndex) => ({
		id: `act-${actIndex}`,
		label: ACT_LABELS[actIndex],
		text: act,
		children: SECTIONS.slice(actIndex * 3, actIndex * 3 + 3).map((section, sectionIndex) => ({
			id: `section-${actIndex}-${sectionIndex}`,
			label: section.label,
			text: section.text,
			children: Array.from({ length: section.to - section.from + 1 }, (_, i) => {
				const n = section.from + i
				const [title, summary] = CHAPTERS[n - 1]
				return {
					id: `chapter-${n}`,
					title: n === CHAPTERS.length ? title : `${n}. ${title}`,
					text: summary,
					detailKey: String(n),
				}
			}),
		})),
	})),
}
