// A hand-curated set of well-known publishers and their ISBN registrant
// blocks in the English-language quadrant.
//
// Each entry's `relativePrefix` is the publisher's ISBN prefix encoded the
// same way as the upstream tile filenames: take the without-dashes ISBN
// prefix (e.g. "9780307" for 978-0-307) and replace the leading "978" with
// "0" or "979" with "1". So:
//
//   978-0-14  -> 9780_14   -> 0014
//   978-0-307 -> 9780_307  -> 00307
//   978-0-596 -> 9780_596  -> 00596
//   978-1-101 -> 9781_101  -> 01101
//   978-1-250 -> 9781_250  -> 01250
//
// Note that the second character ("group") is always "0" or "1" for the
// English-language registration groups; longer group numbers (like the
// German "3" or French "2") would also have a single first digit, but our
// English bundle never visits those.
//
// `parent` groups imprints that today belong to the same publishing house
// (after decades of mergers). It is used purely for color-coding.

export interface PublisherEntry {
	relativePrefix: string
	name: string
	parent?: string
}

export const PUBLISHERS: PublisherEntry[] = [
	// Penguin Random House -- US imprints
	{ relativePrefix: '00307', name: 'Random House', parent: 'PRH' },
	{ relativePrefix: '00345', name: 'Ballantine', parent: 'PRH' },
	{ relativePrefix: '00375', name: 'Random House (modern)', parent: 'PRH' },
	{ relativePrefix: '00385', name: 'Doubleday', parent: 'PRH' },
	{ relativePrefix: '00394', name: 'Knopf', parent: 'PRH' },
	{ relativePrefix: '00399', name: 'Putnam', parent: 'PRH' },
	{ relativePrefix: '00440', name: 'Dell', parent: 'PRH' },
	{ relativePrefix: '00451', name: 'NAL / Signet', parent: 'PRH' },
	{ relativePrefix: '00525', name: 'Dutton / Viking', parent: 'PRH' },
	{ relativePrefix: '00553', name: 'Bantam', parent: 'PRH' },
	{ relativePrefix: '00670', name: 'Viking', parent: 'PRH' },
	{ relativePrefix: '00679', name: 'Vintage', parent: 'PRH' },
	{ relativePrefix: '01101', name: 'PRH (modern catch-all)', parent: 'PRH' },

	// Penguin Random House -- UK imprints
	{ relativePrefix: '0014', name: 'Penguin (UK)', parent: 'PRH' },
	{ relativePrefix: '00241', name: 'Penguin Press (UK)', parent: 'PRH' },
	{ relativePrefix: '00224', name: 'Jonathan Cape', parent: 'PRH' },
	{ relativePrefix: '00701', name: 'Chatto & Windus', parent: 'PRH' },
	{ relativePrefix: '00370', name: 'Bodley Head', parent: 'PRH' },

	// HarperCollins
	{ relativePrefix: '00006', name: 'HarperCollins UK', parent: 'HarperCollins' },
	{ relativePrefix: '00061', name: 'HarperCollins US', parent: 'HarperCollins' },

	// Simon & Schuster
	{ relativePrefix: '00671', name: 'Pocket Books', parent: 'Simon & Schuster' },
	{ relativePrefix: '00684', name: 'Scribner', parent: 'Simon & Schuster' },
	{ relativePrefix: '00743', name: 'Simon & Schuster (US)', parent: 'Simon & Schuster' },
	{ relativePrefix: '01416', name: 'Simon & Schuster', parent: 'Simon & Schuster' },
	{ relativePrefix: '01451', name: 'Simon & Schuster', parent: 'Simon & Schuster' },
	{ relativePrefix: '01501', name: 'Simon & Schuster', parent: 'Simon & Schuster' },

	// Macmillan / Holtzbrinck
	{ relativePrefix: '00312', name: "St. Martin's Press", parent: 'Macmillan' },
	{ relativePrefix: '00374', name: 'FSG', parent: 'Macmillan' },
	{ relativePrefix: '01250', name: "St. Martin's / Macmillan", parent: 'Macmillan' },
	{ relativePrefix: '01627', name: 'Henry Holt', parent: 'Macmillan' },

	// Hachette
	{ relativePrefix: '00316', name: 'Little, Brown', parent: 'Hachette' },
	{ relativePrefix: '00446', name: 'Warner / Grand Central', parent: 'Hachette' },
	{ relativePrefix: '01401', name: 'Hyperion', parent: 'Hachette' },

	// Other notable
	{ relativePrefix: '0019', name: 'Oxford University Press', parent: 'OUP' },
	{ relativePrefix: '00521', name: 'Cambridge University Press', parent: 'CUP' },
	{ relativePrefix: '00262', name: 'MIT Press', parent: 'MIT' },
	{ relativePrefix: '00393', name: 'W. W. Norton', parent: 'Norton' },
	{ relativePrefix: '00470', name: 'Wiley', parent: 'Wiley' },
	{ relativePrefix: '00471', name: 'Wiley', parent: 'Wiley' },
	{ relativePrefix: '00590', name: 'Scholastic (US)', parent: 'Scholastic' },
	{ relativePrefix: '00545', name: 'Scholastic (US)', parent: 'Scholastic' },
	{ relativePrefix: '007475', name: 'Bloomsbury', parent: 'Bloomsbury' },
	{ relativePrefix: '01408', name: 'Bloomsbury', parent: 'Bloomsbury' },
	{ relativePrefix: '01596', name: 'First Second / Macmillan', parent: 'Macmillan' },
	{ relativePrefix: '01419', name: 'Abrams', parent: 'Abrams' },

	// Tech publishers (a fun pocket of ISBN-space for developers to recognize)
	{ relativePrefix: '00596', name: "O'Reilly", parent: "O'Reilly" },
	{ relativePrefix: '01491', name: "O'Reilly", parent: "O'Reilly" },
	{ relativePrefix: '01593', name: 'No Starch Press', parent: 'No Starch' },
	{ relativePrefix: '01617', name: 'Manning', parent: 'Manning' },
	{ relativePrefix: '00321', name: 'Addison-Wesley / Pearson', parent: 'Pearson' },
	{ relativePrefix: '00134', name: 'Prentice Hall / Pearson', parent: 'Pearson' },
]
