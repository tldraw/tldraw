import { Key, LokaliseApi } from '@lokalise/node-api'

// Corrects individual machine translations directly in Lokalise. The automated
// i18n pipeline orders Google translations for new keys (see
// i18n-upload-strings.ts), and occasionally a string comes back wrong: a word
// translated in the wrong sense, or placeholders/tags scrambled. This script
// patches those specific (key, locale) translations in place.
//
// It only ever touches the translations listed in FIXES, never English, and by
// default runs as a dry run. Pass --apply to actually write to Lokalise.
//
// Lokalise holds two separate projects and a run targets exactly one of them,
// so every fix declares which project it belongs to and --project selects it:
//
//   yarn i18n-fix-strings --project=sdk               # dry run, prints the before/after diff
//   yarn i18n-fix-strings --project=dotcom --apply    # write the corrections to Lokalise

/** Gap between Lokalise calls; the API allows six requests a second per token. */
const REQUEST_INTERVAL_MS = 250

function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

type ProjectName = 'sdk' | 'dotcom'

/** Which env var holds each project's Lokalise ID. */
const PROJECT_ENV_VAR: Record<ProjectName, string> = {
	sdk: 'LOKALISE_TLDRAW_PROJECT_ID',
	dotcom: 'LOKALISE_PROJECT_ID',
}

/**
 * A corrected value. Plain keys take a string; a Lokalise plural key takes the
 * full map of plural forms, because writing a bare string to one would collapse
 * every form into a single value.
 */
type FixValue = string | Record<string, string>

interface StringFix {
	/** Which Lokalise project this key lives in. */
	project: ProjectName
	/** Lokalise key name (the hashed key shared across all locales). */
	key: string
	/** English source string, for reviewer context and placeholder validation. */
	english: string
	/** Corrected translations, keyed by repo locale code (e.g. 'fr', 'ko-kr'). */
	translations: Record<string, { value: FixValue; note: string }>
}

const FIXES: StringFix[] = [
	{
		project: 'dotcom',
		key: '9983381c21',
		english: 'Clear search',
		translations: {
			fr: {
				value: 'Effacer la recherche',
				note: 'Was "Recherche propre" (clean/proper search) — translated "Clear" as an adjective instead of the verb.',
			},
		},
	},
	{
		project: 'dotcom',
		key: '029f235f01',
		english: 'We’re working on support for files from <a><strong>[%1$s:appName]</strong></a>.',
		translations: {
			bn: {
				value:
					'আমরা <a><strong>[%1$s:appName]</strong></a> থেকে আসা ফাইলগুলির জন্য সমর্থন যোগ করার কাজ করছি।',
				note: 'Closing </a> was dropped, which fails ICU parsing with UNCLOSED_TAG and breaks build-i18n.',
			},
			'pt-pt': {
				value:
					'Estamos a trabalhar no suporte para ficheiros de <a><strong>[%1$s:appName]</strong></a>.',
				note: 'Was the pt-BR wording ("Estamos trabalhando", "arquivos"); pt-PT uses "a trabalhar" and "ficheiros".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '093ac7483a',
		english: 'Can’t open [%1$s:extension] files yet',
		translations: {
			nl: {
				value: 'Kan [%1$s:extension] bestanden nog niet openen.',
				note: 'Placeholder name was localised ([%1$s:extensie]), so it never interpolated at runtime.',
			},
			tr: {
				value: 'Henüz [%1$s:extension] dosyaları açılamıyor.',
				note: 'Placeholder name was localised ([%1$s:uzantı]), so it never interpolated at runtime.',
			},
			'ko-kr': {
				value: '[%1$s:extension] 파일을 아직 열 수 없습니다.',
				note: 'Placeholder name was localised ([%1$s:확장자]), so it never interpolated at runtime.',
			},
			gl: {
				value: 'Aínda non se poden abrir os ficheiros [%1$s:extension]',
				note: 'Placeholder name was localised ([%1$s:extensión]), so it never interpolated at runtime.',
			},
			'pt-pt': {
				value: 'Ainda não é possível abrir ficheiros [%1$s:extension]',
				note: 'Was "arquivos", the pt-BR word for files; pt-PT uses "ficheiros".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '2755e3ab39',
		english: '<name>[%1$s:author]</name> commented on your board',
		translations: {
			'zh-tw': {
				value: '<name>[%1$s:author]</name> 在您的白板上留言',
				note: 'The <name> tag was dropped and replaced with the literal word "作者" ("author"), so the name lost its styling.',
			},
			'zh-cn': {
				value: '<name>[%1$s:author]</name> 在您的白板上发表了评论',
				note: 'The <name> tag was dropped and replaced with the literal word "作者" ("author"), so the name lost its styling.',
			},
		},
	},
	{
		project: 'dotcom',
		key: '53770fd374',
		english: 'Unread',
		translations: {
			pl: {
				value: 'Nieprzeczytane',
				note: 'Was "Niewykształcony" — "uneducated". Wrong sense of "unread" entirely.',
			},
			'hi-in': {
				value: 'अपठित',
				note: 'Was "अपठित ग" with a stray trailing character.',
			},
			el: {
				value: 'Μη αναγνωσμένα',
				note: 'Was "Αδιάβαστος" — masculine adjective for a person who has not studied.',
			},
			'ko-kr': {
				value: '읽지 않음',
				note: 'Was "읽히지 않는", a passive participle that cannot stand alone as a filter label.',
			},
			cs: {
				value: 'Nepřečtené',
				note: 'Was "Nepřečtený", masculine singular; the label covers notifications (neuter plural).',
			},
		},
	},
	{
		project: 'dotcom',
		key: '545241e7dd',
		english: '[%1$s:count] unread',
		translations: {
			no: {
				value: '[%1$s:count] ulest',
				note: 'Placeholder name was localised ([%1$s:antall]), so it never interpolated at runtime.',
			},
			cs: {
				value: '[%1$s:count] nepřečtených',
				note: 'Placeholder name was localised ([%1$s:počet]), so it never interpolated at runtime.',
			},
			da: {
				value: '[%1$s:count] ulæste',
				note: 'Placeholder name was localised ([%1$s:antal]), so it never interpolated at runtime.',
			},
			uk: {
				value: 'Непрочитані [%1$s:count]',
				note: 'Placeholder name was localised ([%1$s:кількість]), so it never interpolated at runtime.',
			},
			hr: {
				value: '[%1$s:count] nepročitano',
				note: 'Placeholder name was localised ([%1$s:broj]), so it never interpolated at runtime.',
			},
			ne: {
				value: '[%1$s:count] नपढिएको',
				note: 'Placeholder name was localised ([%1$s:गणना]), so it never interpolated at runtime.',
			},
			'gu-in': {
				value: '[%1$s:count] વાંચ્યા વગરની',
				note: 'Placeholder name was localised ([%1$s:ગણતરી]), so it never interpolated at runtime.',
			},
			sl: {
				value: '[%1$s:count] neprebranih',
				note: 'Placeholder name was localised ([%1$s:število]), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'dotcom',
		key: '5bffeebf03',
		english: '<name>[%1$s:author]</name> reacted to your comment',
		translations: {
			'zh-tw': {
				value: '<name>[%1$s:author]</name> 對您的留言做出了回應',
				note: 'The <name> tag was dropped and the name wrapped in literal parentheses after the word "作者".',
			},
			'zh-cn': {
				value: '<name>[%1$s:author]</name> 对您的评论做出了回应',
				note: 'The <name> tag was dropped and the name wrapped in literal parentheses after the word "作者".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '608e9d366e',
		english: 'You’re all caught up.',
		translations: {
			cs: {
				value: 'Máte přečteno vše.',
				note: 'Was "Všechno máte v plánu." ("You have everything planned").',
			},
			hr: {
				value: 'Sve ste pročitali.',
				note: 'Was "Sve ste shvatili." ("You understood everything").',
			},
			hu: {
				value: 'Mindent elolvastál.',
				note: 'Was "Mindennel fel vagy készülve." ("You are prepared with everything").',
			},
			el: {
				value: 'Τα έχετε δει όλα.',
				note: 'Was "Τα έχεις όλα καταφέρει." ("You have achieved everything").',
			},
			fa: {
				value: 'همه را دیده‌اید.',
				note: 'Was "همه‌تون گرفتارین." ("You are all busy/stuck") — opposite meaning.',
			},
			ur: {
				value: 'آپ سب کچھ دیکھ چکے ہیں۔',
				note: 'Was "آپ سب پکڑے گئے ہیں۔" ("You have all been caught/arrested") — literal reading of "caught up".',
			},
			tl: {
				value: 'Nabasa mo na ang lahat.',
				note: 'Was "Nahuli na kayong lahat." ("You have all been caught/are late").',
			},
			so: {
				value: 'Wax cusub ma jiraan.',
				note: 'Was "Dhammaantiin waad la qabsateen." ("You have all adapted").',
			},
			'km-kh': {
				value: 'អ្នកបានមើលទាំងអស់ហើយ។',
				note: 'Was "អ្នកបានរៀនចប់អស់ហើយ។" ("You have finished studying").',
			},
			ml: {
				value: 'എല്ലാം വായിച്ചുകഴിഞ്ഞു.',
				note: 'Was "നിങ്ങൾക്ക് എല്ലാം മനസ്സിലായി." ("You understood everything").',
			},
			pa: {
				value: 'ਤੁਸੀਂ ਸਭ ਕੁਝ ਪੜ੍ਹ ਲਿਆ ਹੈ।',
				note: 'Was "ਤੁਸੀਂ ਸਭ ਕੁਝ ਸਮਝ ਲਿਆ ਹੈ।" ("You understood everything").',
			},
			ne: {
				value: 'तपाईंले सबै हेरिसक्नुभयो।',
				note: 'Was "तिमी सबै कुरा बुझिसक्यौ।" ("You understood everything") and used the intimate register.',
			},
			ru: {
				value: 'Вы всё просмотрели.',
				note: 'Was "Вы всё в курсе." which is ungrammatical.',
			},
			sl: {
				value: 'Vse ste prebrali.',
				note: 'Was "Vse si ujela." — feminine singular and "caught" in the literal sense.',
			},
			ro: {
				value: 'Ești la zi.',
				note: 'Was "Ești la zi cu toții." which mixes singular and plural.',
			},
			no: {
				value: 'Du er ajour.',
				note: 'Was "Du er ferdig med alt." ("You are done with everything").',
			},
			sv: {
				value: 'Du är ikapp.',
				note: 'Was "Du har allt ikapp." which is not idiomatic.',
			},
			fi: {
				value: 'Olet ajan tasalla.',
				note: 'Was "Olet kärryillä.", too colloquial for UI.',
			},
			ms: {
				value: 'Anda sudah membaca semuanya.',
				note: 'Was "Korang semua dah selesai.", heavy slang.',
			},
			'pt-pt': {
				value: 'Está a par de tudo.',
				note: 'Was the pt-BR wording "Você está totalmente a par de tudo."',
			},
		},
	},
	{
		project: 'dotcom',
		key: '61fb03fd7b',
		english:
			'{count, plural, one {Someone reacted to your comment} other {# people reacted to your comment}}',
		translations: {
			ru: {
				value: {
					one: 'Кто-то отреагировал на ваш комментарий',
					few: '# человека отреагировали на ваш комментарий',
					many: '# человек отреагировали на ваш комментарий',
					other: '# человека отреагировали на ваш комментарий',
				},
				note: 'few/many were empty, so counts of 2–4 and 5+ rendered a blank notification. Also fixed the mid-sentence capital in "Люди".',
			},
			pl: {
				value: {
					one: 'Ktoś zareagował na Twój komentarz',
					few: '# osoby zareagowały na Twój komentarz',
					many: '# osób zareagowało na Twój komentarz',
					other: '# osób zareagowało na Twój komentarz',
				},
				note: 'few/many were empty, so counts of 2–4 and 5+ rendered blank.',
			},
			cs: {
				value: {
					one: 'Někdo reagoval na váš komentář',
					few: '# lidé reagovali na váš komentář',
					many: '# lidí reagovalo na váš komentář',
					other: '# lidí reagovalo na váš komentář',
				},
				note: 'few/many were empty, so counts of 2–4 rendered blank.',
			},
			uk: {
				value: {
					one: 'Хтось відреагував на ваш коментар',
					few: '# особи відреагували на ваш коментар',
					many: '# осіб відреагували на ваш коментар',
					other: '# осіб відреагували на ваш коментар',
				},
				note: 'few/many were empty, so counts of 2–4 and 5+ rendered blank.',
			},
			ar: {
				value: {
					zero: 'لم يتفاعل أحد مع تعليقك',
					one: 'تفاعل شخص واحد مع تعليقك',
					two: 'تفاعل شخصان مع تعليقك',
					few: 'تفاعل # أشخاص مع تعليقك',
					many: 'تفاعل # شخصًا مع تعليقك',
					other: 'تفاعل # شخص مع تعليقك',
				},
				note: 'zero/two/few/many were all empty, and the other form had no # at all, so Arabic never showed a number.',
			},
			he: {
				value: {
					one: 'מישהו הגיב לתגובה שלך',
					two: '# אנשים הגיבו לתגובה שלך',
					many: '# אנשים הגיבו לתגובה שלך',
					other: '# אנשים הגיבו לתגובה שלך',
				},
				note: 'two/many were empty, so those counts rendered blank.',
			},
			hr: {
				value: {
					one: 'Netko je reagirao na tvoj komentar',
					few: '# osobe reagirale su na tvoj komentar',
					other: '# osoba reagiralo je na tvoj komentar',
				},
				note: 'few was empty, so counts of 2–4 rendered blank. Also aligned the other form to the informal "tvoj" used in the one form.',
			},
			ro: {
				value: {
					one: 'Cineva a reacționat la comentariul tău',
					few: '# persoane au reacționat la comentariul tău',
					other: '# de persoane au reacționat la comentariul tău',
				},
				note: 'few was empty, so counts of 2–19 rendered blank.',
			},
			sl: {
				value: {
					one: 'Nekdo se je odzval na tvoj komentar',
					two: '# osebi sta se odzvali na tvoj komentar',
					few: '# osebe so se odzvale na tvoj komentar',
					other: '# oseb se je odzvalo na tvoj komentar',
				},
				note: 'two/few were empty, so those counts rendered blank. Also aligned the other form to the informal "tvoj".',
			},
			tl: {
				value: {
					one: 'May nag-react sa komento mo',
					other: '# tao ang nag-react sa komento mo',
				},
				note: 'zero/two/few/many were empty placeholders Tagalog does not use; removing them leaves one/other, which is what CLDR defines for tl.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'b03400e2db',
		english: '<name>[%1$s:author]</name> replied',
		translations: {
			ms: {
				value: '<name>[%1$s:author]</name> membalas',
				note: 'Placeholder name was localised ([%1$s:pengarang]), so it never interpolated at runtime.',
			},
			sv: {
				value: '<name>[%1$s:author]</name> svarade',
				note: 'Placeholder name was localised ([%1$s:författare]), so it never interpolated at runtime.',
			},
			no: {
				value: '<name>[%1$s:author]</name> svarte',
				note: 'Placeholder name was localised ([%1$s:forfatter]), so it never interpolated at runtime.',
			},
			hu: {
				value: '<name>[%1$s:author]</name> válaszolt',
				note: 'Placeholder name was localised ([%1$s:szerző]), so it never interpolated at runtime.',
			},
			pa: {
				value: '<name>[%1$s:author]</name> ਨੇ ਜਵਾਬ ਦਿੱਤਾ',
				note: 'Placeholder name was localised ([%1$s:ਲੇਖਕ]), so it never interpolated at runtime.',
			},
			ne: {
				value: '<name>[%1$s:author]</name> ले जवाफ दिनुभयो',
				note: 'Placeholder name was localised ([%1$s:लेखक]), so it never interpolated at runtime.',
			},
			'gu-in': {
				value: '<name>[%1$s:author]</name> એ જવાબ આપ્યો',
				note: 'Placeholder name was localised ([%1$s:લેખક]), so it never interpolated at runtime.',
			},
			so: {
				value: '<name>[%1$s:author]</name> ayaa ku jawaabay',
				note: 'Placeholder name was localised ([%1$s:author]), so it never interpolated at runtime.',
			},
			sl: {
				value: '<name>[%1$s:author]</name> je odgovoril',
				note: 'Placeholder name was localised ([%1$s:avtor]), so it never interpolated at runtime.',
			},
			te: {
				value: '<name>[%1$s:author]</name> ప్రత్యుత్తరం ఇచ్చారు',
				note: 'Placeholder name was localised ([%1$s:రచయిత]), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'b1c94ca2fb',
		english: 'All',
		translations: {
			el: {
				value: 'Όλα',
				note: 'Was "Ολοι" — masculine plural and missing its accent.',
			},
			he: {
				value: 'הכול',
				note: 'Was "כֹּל" with vocalisation marks and in construct form.',
			},
			ar: {
				value: 'الكل',
				note: 'Was "الجميع" ("everyone"), which reads as people rather than notifications.',
			},
			tr: {
				value: 'Tümü',
				note: 'Was "Tüm", a determiner that cannot stand alone.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'd0e3556476',
		english:
			'<name>[%1$s:author]</name> and {count, plural, one {# other} other {# others}} reacted to your comment',
		translations: {
			it: {
				value:
					'<name>[%1$s:author]</name> e {count, plural, one {# altro} other {# altri}} hanno reagito al tuo commento',
				note: 'ICU keywords were translated ("plurale", "uno", "altro"), so the argument type is invalid. Keywords restored, Italian text kept.',
			},
			el: {
				value:
					'<name>[%1$s:author]</name> και {count, plural, one {# ακόμη άτομο} other {# ακόμη άτομα}} αντέδρασαν στο σχόλιό σας',
				note: 'Second selector keyword was missing entirely (MISSING_OTHER_CLAUSE) and branch text was left in English. Also dropped the duplicated "ο χρήστης".',
			},
			'hi-in': {
				value:
					'<name>[%1$s:author]</name> और {count, plural, one {# अन्य} other {# अन्य लोगों}} ने आपकी टिप्पणी पर प्रतिक्रिया दी',
				note: 'The "other" selector keyword was translated to "अन्य", leaving no other clause. Keyword restored and branch text translated.',
			},
			so: {
				value:
					'<name>[%1$s:author]</name> iyo {count, plural, one {# qof kale} other {# dad kale}} ayaa ka falceliyay faalladaada',
				note: 'ICU keywords were translated ("jamac", "hal", "kale"), making the argument type invalid.',
			},
			ur: {
				value:
					'<name>[%1$s:author]</name> اور {count, plural, one {# اور} other {# اور لوگوں}} نے آپ کے تبصرے پر ردعمل ظاہر کیا',
				note: 'The "other" selector keyword was translated to "دوسرے", leaving no other clause.',
			},
			'ko-kr': {
				value:
					'<name>[%1$s:author]</name>님과 {count, plural, one {# 명} other {# 명}}이 회원님의 댓글에 반응했습니다.',
				note: 'Plural selector syntax was mangled (stray comma between branches), failing EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'e65b2dcb6f',
		english: '<name>[%1$s:a]</name> and <name>[%1$s:b]</name> reacted to your comment',
		translations: {
			ur: {
				value: '<name>[%1$s:a]</name> اور <name>[%1$s:b]</name> نے آپ کے تبصرے پر ردعمل ظاہر کیا',
				note: 'Second placeholder was corrupted to "[%1$s:b>", so {b} never renders.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'f476ba8646',
		english:
			'<name>[%1$s:a]</name>, <name>[%1$s:b]</name> and {count, plural, one {# other} other {# others}} reacted to your comment',
		translations: {
			so: {
				value:
					'<name>[%1$s:a]</name>, <name>[%1$s:b]</name> iyo {count, plural, one {# qof kale} other {# dad kale}} ayaa ka falceliyay faalladaada',
				note: 'Tag names were translated (<magac> opened, </mage> closed — unmatched) and ICU keywords were translated.',
			},
			it: {
				value:
					'<name>[%1$s:a]</name>, <name>[%1$s:b]</name> e {count, plural, one {# altro} other {# altri}} hanno reagito al tuo commento',
				note: 'ICU keywords were translated ("plurale", "uno", "altro").',
			},
			ms: {
				value:
					'<name>[%1$s:a]</name>, <name>[%1$s:b]</name> dan {count, plural, one {# lagi} other {# lagi}} telah memberi reaksi terhadap komen anda',
				note: 'ICU keywords were translated ("jamak", "seorang") and the other clause was missing.',
			},
			el: {
				value:
					'<name>[%1$s:a]</name>, <name>[%1$s:b]</name> και {count, plural, one {# ακόμη άτομο} other {# ακόμη άτομα}} αντέδρασαν στο σχόλιό σας',
				note: 'The "other" selector keyword was translated to "άλλοι", leaving no other clause.',
			},
			ur: {
				value:
					'<name>[%1$s:a]</name>، <name>[%1$s:b]</name> اور {count, plural, one {# اور} other {# اور لوگوں}} نے آپ کے تبصرے پر ردعمل ظاہر کیا',
				note: 'Second <name> tag was corrupted to "[%1$s:b>" (placeholder and tag merged), losing {b}; the other clause keyword was also translated.',
			},
			tl: {
				value:
					'Sina <name>[%1$s:a]</name>, <name>[%1$s:b]</name> at {count, plural, one {# pa} other {# pa}} ang nag-react sa iyong komento',
				note: 'Plural selector keywords were translated ("isa", "iba pang"), failing EXPECT_PLURAL_ARGUMENT_SELECTOR_FRAGMENT.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'f5ddc8d9c1',
		english: 'For now, you can <a>export as a [%1$s:extension] file</a> to use it here.',
		translations: {
			'pt-pt': {
				value:
					'Por agora, pode <a>exportar como um ficheiro [%1$s:extension]</a> para o utilizar aqui.',
				note: 'The earlier fix restored the placeholder but kept the pt-BR wording ("você pode", "arquivo", "usá-lo"); pt-PT reads "pode", "ficheiro", "para o utilizar".',
			},
			'pt-br': {
				value:
					'Por enquanto, você pode <a>exportar como um arquivo [%1$s:extension]</a> para usá-lo aqui.',
				note: 'Placeholder name was localised ([%1$s:extensão]), so it never interpolated at runtime.',
			},
			nl: {
				value:
					'Voorlopig kun je het <a>exporteren als een [%1$s:extension] bestand</a> om het hier te gebruiken.',
				note: 'Placeholder name was localised ([%1$s:extensie]), so it never interpolated at runtime.',
			},
			'ko-kr': {
				value:
					'지금은 <a>[%1$s:extension] 파일로 내보냄</a>을 사용하여 여기에서 사용할 수 있습니다.',
				note: 'Placeholder name was localised ([%1$s:확장자]), so it never interpolated at runtime.',
			},
			'zh-tw': {
				value: '目前，您可以<a>匯出為 [%1$s:extension] 檔案</a>以便在此處使用。',
				note: 'The <a> link tag was dropped, so the export action had nothing to link.',
			},
			'zh-cn': {
				value: '目前，您可以<a>导出为 [%1$s:extension] 文件</a>以便在此处使用。',
				note: 'The <a> link tag was dropped, so the export action had nothing to link.',
			},
			ja: {
				value:
					'今のところ、<a>[%1$s:extension] ファイルとしてエクスポート</a>すればここで使用できます。',
				note: 'The <a> link tag was dropped, so the export action had nothing to link.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'action.copy-hovered-styles',
		english: 'Copy hovered styles',
		translations: {
			sl: {
				value: 'Kopiraj sloge oblike pod kazalcem',
				note: 'Was a garbled run-on repeating "nad elementi, nad katerimi smo se nahajali nad elementi".',
			},
			hr: {
				value: 'Kopiraj stilove oblika ispod pokazivača',
				note: 'Was a garbled run-on repeating "iznad predmeta iznad kojeg".',
			},
			ro: {
				value: 'Copiază stilurile formei de sub cursor',
				note: 'Was "cu cursorul cursorului" — "cursor" duplicated.',
			},
			da: {
				value: 'Kopiér typografier fra formen under markøren',
				note: 'Was "svævende stilarter" (floating styles) — read "hovered" as "floating".',
			},
			nl: {
				value: 'Kopieer stijlen van vorm onder de cursor',
				note: 'Was "zwevende stijlen" (floating styles) — read "hovered" as "floating".',
			},
			ms: {
				value: 'Salin gaya bentuk di bawah kursor',
				note: 'Was "gaya berlegar" (hovering/floating styles).',
			},
			fi: {
				value: 'Kopioi kursorin alla olevan muodon tyylit',
				note: 'Was "hiirtä osoittavat tyylit" (styles pointing at the mouse) — the relationship was backwards.',
			},
			no: {
				value: 'Kopier stiler fra formen under musepekeren',
				note: 'Was "stiler som holdes over musepekeren" (styles held over the pointer) — backwards.',
			},
			'pt-pt': {
				value: 'Copiar estilos da forma sob o cursor',
				note: 'Was "estilos percorridos" (traversed styles).',
			},
			ur: {
				value: 'کرسر کے نیچے شکل کے اسٹائل کاپی کریں',
				note: 'Was "ہورڈ اسٹائل" — "hovered" mis-transliterated as "hoard".',
			},
			so: {
				value: 'Koobi qaababka qaabka cursor-ka hoostiisa',
				note: 'Was "Qaababka Nuqulka lagu dul hago" — word order made it "styles of the copy".',
			},
			sv: {
				value: 'Kopiera stilar från formen under pekaren',
				note: 'Was "hovrade stilar", an anglicism that is not idiomatic Swedish.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'action.frame-selection',
		english: 'Frame selection',
		translations: {
			de: {
				value: 'Auswahl umrahmen',
				note: 'Was "Rahmenauswahl" (choosing a frame); this action puts the selection into a frame.',
			},
			es: {
				value: 'Enmarcar selección',
				note: 'Was "Selección de marco" (selection of a frame).',
			},
			'pt-br': {
				value: 'Enquadrar seleção',
				note: 'Was "Seleção de moldura" (selection of a picture frame).',
			},
			'pt-pt': {
				value: 'Enquadrar seleção',
				note: 'Was "Seleção de molduras" (selection of picture frames).',
			},
			it: {
				value: 'Inquadra selezione',
				note: 'Was "Selezione della cornice" (selection of the frame).',
			},
			nl: {
				value: 'Selectie omkaderen',
				note: 'Was "Frame selectie", an untranslated noun phrase.',
			},
			pl: {
				value: 'Umieść zaznaczenie w ramce',
				note: 'Was "Wybór ramki" (choice of frame).',
			},
			ru: {
				value: 'Поместить выделение в рамку',
				note: 'Was "Выбор рамки" (choice of frame).',
			},
			uk: {
				value: 'Помістити вибране в рамку',
				note: 'Was "Вибір кадру" (choice of a film frame).',
			},
			cs: {
				value: 'Vložit výběr do rámce',
				note: 'Was "Výběr rámu" (selection of a frame).',
			},
			sv: {
				value: 'Rama in markering',
				note: 'Was "Val av ram" (choice of frame).',
			},
			da: {
				value: 'Indram markering',
				note: 'Was "Valg af ramme" (choice of frame).',
			},
			no: {
				value: 'Ramme inn utvalg',
				note: 'Was "Rammevalg" (frame choice).',
			},
			fi: {
				value: 'Kehystä valinta',
				note: 'Was "Kehyksen valinta" (selection of the frame).',
			},
			tr: {
				value: 'Seçimi çerçevele',
				note: 'Was "Çerçeve seçimi" (frame selection as a noun).',
			},
			el: {
				value: 'Πλαισίωση επιλογής',
				note: 'Was "Επιλογή πλαισίου" (choice of frame).',
			},
			'ko-kr': {
				value: '선택 항목을 프레임으로',
				note: 'Was "프레임 선택" (select a frame).',
			},
			'zh-cn': {
				value: '将所选内容放入画框',
				note: 'Was "框架选择" (frame selection as a noun).',
			},
			'zh-tw': {
				value: '將選取範圍放入畫框',
				note: 'Was "選取畫框" (select the frame).',
			},
			ca: {
				value: 'Emmarca la selecció',
				note: 'Was "Selecció de fotograma" (selection of a film frame).',
			},
			gl: {
				value: 'Enmarcar a selección',
				note: 'Was "Selección de fotogramas" (selection of film frames).',
			},
			hu: {
				value: 'Kijelölés keretezése',
				note: 'Was "Keretkiválasztás" (frame selection as a noun).',
			},
			ro: {
				value: 'Încadrează selecția',
				note: 'Was "Selectarea cadrului" (selecting the frame).',
			},
			hr: {
				value: 'Uokviri odabir',
				note: 'Was "Odabir okvira" (choice of frame).',
			},
			sl: {
				value: 'Uokviri izbor',
				note: 'Was "Izbira okvirja" (choice of frame).',
			},
			id: {
				value: 'Bingkai pilihan',
				note: 'Was "Pemilihan bingkai" (choosing a frame).',
			},
			ms: {
				value: 'Bingkaikan pilihan',
				note: 'Was "Pemilihan bingkai" (choosing a frame).',
			},
			th: {
				value: 'ใส่กรอบให้สิ่งที่เลือก',
				note: 'Was "ตัวเลือกกรอบ" (frame options).',
			},
			he: {
				value: 'מסגור הבחירה',
				note: 'Was "בחירת מסגרת" (choosing a frame).',
			},
			ar: {
				value: 'تأطير التحديد',
				note: 'Was "اختيار الإطار" (choosing the frame).',
			},
			fa: {
				value: 'قاب‌بندی انتخاب',
				note: 'Was "انتخاب قاب" (choosing a frame).',
			},
			'hi-in': {
				value: 'चयन को फ़्रेम करें',
				note: 'Was "फ्रेम चयन" (frame selection as a noun).',
			},
			bn: {
				value: 'নির্বাচনকে ফ্রেম করুন',
				note: 'Was "ফ্রেম নির্বাচন" (frame selection as a noun).',
			},
			ur: {
				value: 'انتخاب کو فریم کریں',
				note: 'Was "فریم کا انتخاب" (choice of frame).',
			},
			ta: {
				value: 'தேர்வைச் சட்டகமிடு',
				note: 'Was "சட்டகத் தேர்வு" (frame selection as a noun).',
			},
			te: {
				value: 'ఎంపికను ఫ్రేమ్ చేయండి',
				note: 'Was "ఫ్రేమ్ ఎంపిక" (frame selection as a noun).',
			},
			kn: {
				value: 'ಆಯ್ಕೆಯನ್ನು ಫ್ರೇಮ್ ಮಾಡಿ',
				note: 'Was "ಫ್ರೇಮ್ ಆಯ್ಕೆ" (frame selection as a noun).',
			},
			ml: {
				value: 'തിരഞ്ഞെടുപ്പ് ഫ്രെയിം ചെയ്യുക',
				note: 'Was "ഫ്രെയിം തിരഞ്ഞെടുക്കൽ" (choosing a frame).',
			},
			mr: {
				value: 'निवड फ्रेम करा',
				note: 'Was "फ्रेम निवड" (frame selection as a noun).',
			},
			'gu-in': {
				value: 'પસંદગીને ફ્રેમ કરો',
				note: 'Was "ફ્રેમ પસંદગી" (frame selection as a noun).',
			},
			pa: {
				value: 'ਚੋਣ ਨੂੰ ਫਰੇਮ ਕਰੋ',
				note: 'Was "ਫਰੇਮ ਚੋਣ" (frame selection as a noun).',
			},
			ne: {
				value: 'चयनलाई फ्रेम गर्नुहोस्',
				note: 'Was "फ्रेम चयन" (frame selection as a noun).',
			},
			'km-kh': {
				value: 'ដាក់ស៊ុមលើជម្រើស',
				note: 'Was "ការជ្រើសរើសស៊ុម" (choosing a frame).',
			},
			tl: {
				value: 'I-frame ang napili',
				note: 'Was "Pagpili ng frame" (choosing a frame).',
			},
			so: {
				value: 'Ku duub xulashada',
				note: 'Was "Xulashada qaab-dhismeedka" (selection of the structure).',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.mention-you',
		english: 'You',
		translations: {
			'pt-pt': {
				value: 'Você',
				note: 'Was "Eu" ("I/me"), which contradicts the English label and diverges from pt-BR.',
			},
			ms: {
				value: 'Anda',
				note: 'Was "Awak", the informal second person; the rest of the Malay UI uses "Anda".',
			},
			bn: {
				value: 'আপনি',
				note: 'Was "তুমি", the intimate second person.',
			},
			ml: {
				value: 'നിങ്ങൾ',
				note: 'Was "നീ", the intimate second person.',
			},
			hr: {
				value: 'Vi',
				note: 'Was "Vas", the accusative form; a standalone label takes the nominative.',
			},
			he: {
				value: 'אתה',
				note: 'Was "אַתָה" with vocalisation marks, which no UI string in this project uses.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.only-unread',
		english: 'Only unread',
		translations: {
			fr: {
				value: 'Non lus uniquement',
				note: 'Was "Seulement les pages non lues" — filters comments, not pages.',
			},
			tl: {
				value: 'Hindi pa nababasa lamang',
				note: 'Was "Hindi pa nababasa" — dropped "Only", making it identical to the Unread label.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.pin-label',
		english: 'Comment by {name}',
		translations: {
			nl: {
				value: 'Reactie van {name}',
				note: 'Placeholder name was localised ({naam}), so it never interpolated at runtime.',
			},
			sv: {
				value: 'Kommentar av {name}',
				note: 'Placeholder name was localised ({namn}), so it never interpolated at runtime.',
			},
			id: {
				value: 'Komentar oleh {name}',
				note: 'Placeholder name was localised ({nama}), so it never interpolated at runtime.',
			},
			no: {
				value: 'Kommentar av {name}',
				note: 'Placeholder name was localised ({navn}), so it never interpolated at runtime.',
			},
			da: {
				value: 'Kommentar af {name}',
				note: 'Placeholder name was localised ({navn}), so it never interpolated at runtime.',
			},
			pa: {
				value: '{name} ਦੁਆਰਾ ਟਿੱਪਣੀ',
				note: 'Placeholder name was localised ({ਨਾਮ}), so it never interpolated at runtime.',
			},
			ne: {
				value: '{name} द्वारा टिप्पणी',
				note: 'Placeholder name was localised ({नाम}), so it never interpolated at runtime.',
			},
			'gu-in': {
				value: '{name} દ્વારા ટિપ્પણી',
				note: 'Placeholder name was localised ({નામ}), so it never interpolated at runtime.',
			},
			'km-kh': {
				value: 'មតិយោបល់ដោយ {name}',
				note: 'Placeholder name was localised ({ឈ្មោះ}), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.pin-label-resolved',
		english: 'Resolved comment by {name}',
		translations: {
			nl: {
				value: 'Reactie van {name} opgelost',
				note: 'Placeholder name was localised ({naam}), so it never interpolated at runtime.',
			},
			id: {
				value: 'Komentar oleh {name} telah diselesaikan.',
				note: 'Placeholder name was localised ({nama}), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.preview-more',
		english: '{count} more',
		translations: {
			fa: {
				value: '{count} بیشتر',
				note: 'Placeholder name was localised ({تعداد}), so it never interpolated at runtime.',
			},
			ms: {
				value: '{count} lagi',
				note: 'Placeholder name was localised ({kiraan}), so it never interpolated at runtime.',
			},
			id: {
				value: '{count} lagi',
				note: 'Placeholder name was localised ({hitung}), so it never interpolated at runtime.',
			},
			no: {
				value: '{count} flere',
				note: 'Placeholder name was localised ({antall}), so it never interpolated at runtime.',
			},
			da: {
				value: '{count} mere',
				note: 'Placeholder name was localised ({antal}), so it never interpolated at runtime.',
			},
			hu: {
				value: '{count} további',
				note: 'Placeholder name was localised ({szám}), so it never interpolated at runtime.',
			},
			pa: {
				value: '{count} ਹੋਰ',
				note: 'Placeholder name was localised ({ਗਿਣਤੀ}), so it never interpolated at runtime.',
			},
			hr: {
				value: 'još {count}',
				note: 'Placeholder name was localised ({broj}), so it never interpolated at runtime.',
			},
			ne: {
				value: '{count} बढी',
				note: 'Placeholder name was localised ({गन्ती}), so it never interpolated at runtime.',
			},
			'gu-in': {
				value: '{count} વધુ',
				note: 'Placeholder name was localised ({ગણતરી}), so it never interpolated at runtime.',
			},
			so: {
				value: '{count} wax badan',
				note: 'Placeholder name was localised ({tirin}), so it never interpolated at runtime.',
			},
			tl: {
				value: '{count} pa',
				note: 'Placeholder name was localised ({bilangin}), so it never interpolated at runtime.',
			},
			kn: {
				value: 'ಇನ್ನೂ {count}',
				note: 'Placeholder name was localised ({ಎಣಿಕೆ}), so it never interpolated at runtime.',
			},
			ml: {
				value: '{count} കൂടി',
				note: 'Placeholder name was localised ({എണ്ണുക}), so it never interpolated at runtime.',
			},
			'km-kh': {
				value: '{count} ទៀត',
				note: 'The placeholder name was translated out of the braces, leaving an empty {} that never interpolates.',
			},
			ta: {
				value: 'மேலும் {count}',
				note: 'The {count} placeholder was dropped entirely, so no number showed.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.reacted-1',
		english: '{a} reacted',
		translations: {
			he: {
				value: '{a} הגיב',
				note: 'Placeholder name was localised ({א}), so it never interpolated at runtime.',
			},
			sv: {
				value: '{a} reagerade',
				note: 'The {a} placeholder was dropped, so the string read just "reagerade" with no name.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.reacted-2',
		english: '{a} and {b} reacted',
		translations: {
			fa: {
				value: '{a} و {b} واکنش نشان دادند',
				note: 'Placeholder name was localised ({الف}, {ب}), so it never interpolated at runtime.',
			},
			he: {
				value: '{a} ו-{b} הגיבו',
				note: 'Placeholder name was localised ({א}, {ב}), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.reacted-3',
		english: '{a}, {b} and {c} reacted',
		translations: {
			he: {
				value: '{a}, {b} ו-{c} הגיבו',
				note: 'Placeholder name was localised ({א}, {ב}, {ג}), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.reacted-more',
		english: '{a}, {b}, {c} and {count} others reacted',
		translations: {
			pa: {
				value: '{a}, {b}, {c} ਅਤੇ {count} ਹੋਰਾਂ ਨੇ ਪ੍ਰਤੀਕਿਰਿਆ ਦਿੱਤੀ',
				note: 'Placeholder name was localised ({a}, {b}, {c}, {ਗਿਣਤੀ}), so it never interpolated at runtime.',
			},
			'gu-in': {
				value: '{a}, {b}, {c} અને {count} અન્ય લોકોએ પ્રતિક્રિયા આપી',
				note: 'Placeholder name was localised ({a}, {b}, {c}, {ગણતરી}), so it never interpolated at runtime.',
			},
			ml: {
				value: '{a}, {b}, {c} എന്നിവരും മറ്റ് {count} പേരും പ്രതികരിച്ചു',
				note: 'The {count} placeholder was dropped, so the number of other reactors never showed.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.reopen',
		english: 'Reopen',
		translations: {
			el: {
				value: 'Άνοιγμα ξανά',
				note: 'Was "Ξανανοίγω" — first-person "I reopen".',
			},
			hr: {
				value: 'Ponovno otvori',
				note: 'Was "Ponovo otvoriti", the infinitive; buttons take the imperative.',
			},
			pl: {
				value: 'Otwórz ponownie',
				note: 'Was "Otworzyć na nowo", the infinitive.',
			},
			sl: {
				value: 'Ponovno odpri',
				note: 'Was "Ponovno odprto" — the adjective "reopened".',
			},
			'zh-tw': {
				value: '重新開啟',
				note: 'Was "重新開放" — reopening to the public.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.replies',
		english: '{count} replies',
		translations: {
			hr: {
				value: '{count} odgovora',
				note: 'Placeholder name was localised ({broj}), so it never interpolated at runtime.',
			},
			ne: {
				value: '{count} उत्तरहरू',
				note: 'Placeholder name was localised ({गणना}), so it never interpolated at runtime.',
			},
			'gu-in': {
				value: '{count} જવાબો',
				note: 'Placeholder name was localised ({ગણતરી}), so it never interpolated at runtime.',
			},
			'km-kh': {
				value: 'ចម្លើយចំនួន {count}',
				note: 'Placeholder name was localised ({រាប់}), so it never interpolated at runtime.',
			},
			so: {
				value: '{count} jawaabo',
				note: 'Placeholder name was localised ({tiro}), so it never interpolated at runtime.',
			},
			sl: {
				value: '{count} odgovorov',
				note: 'Placeholder name was localised ({število}), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.resolve',
		english: 'Resolve',
		translations: {
			cs: {
				value: 'Vyřešit',
				note: 'Was "Odhodlání" — the noun "resolve/determination" (willpower), not the verb.',
			},
			hr: {
				value: 'Riješi',
				note: 'Was "Odlučnost" — the noun "decisiveness".',
			},
			hu: {
				value: 'Megoldás',
				note: 'Was "Elhatározás" — the noun "resolution/determination" (willpower).',
			},
			el: {
				value: 'Επίλυση',
				note: 'Was "Αποφασίζω" — first-person "I decide".',
			},
			ar: {
				value: 'حل',
				note: 'Was "الحل" — the definite noun "the solution".',
			},
			fa: {
				value: 'حل کردن',
				note: 'Was "حل و فصل" — legal "adjudication/settlement".',
			},
			pl: {
				value: 'Rozwiąż',
				note: 'Was "Rozstrzygać" — imperfective infinitive "to adjudicate".',
			},
			ru: {
				value: 'Решить',
				note: 'Was "Урегулировать" — "to settle/regulate", wrong register for a thread action.',
			},
			th: {
				value: 'ทำเครื่องหมายว่าแก้ไขแล้ว',
				note: 'Was "แก้ปัญหา" — "solve a problem".',
			},
			fi: {
				value: 'Ratkaise',
				note: 'Was "Ratkaista", the infinitive; buttons take the imperative.',
			},
			sv: {
				value: 'Lös',
				note: 'Was "Lösa", the infinitive; buttons take the imperative.',
			},
			no: {
				value: 'Løs',
				note: 'Was "Løse", the infinitive; buttons take the imperative.',
			},
			ro: {
				value: 'Rezolvă',
				note: 'Was "Rezolva", missing the imperative form.',
			},
			ta: {
				value: 'தீர்க்கப்பட்டதாகக் குறி',
				note: 'Was "தீர்வு" — the noun "solution".',
			},
			he: {
				value: 'סגור נושא',
				note: 'Was "לִפְתוֹר" — vocalised infinitive "to solve", wrong register for UI.',
			},
			de: {
				value: 'Erledigen',
				note: 'Was "Klären" (clarify); "Erledigen" is what German UIs use for resolving a comment thread.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.resolved',
		english: 'Resolved',
		translations: {
			el: {
				value: 'Επιλύθηκε',
				note: 'Was "Αποφασισμένος" — masculine adjective "determined (person)".',
			},
			ru: {
				value: 'Решено',
				note: 'Was "Урегулированы" — "settled/regulated", wrong register and plural agreement.',
			},
			th: {
				value: 'แก้ไขแล้ว',
				note: 'Was "แก้ปัญหาแล้ว" — "the problem was solved".',
			},
			de: {
				value: 'Erledigt',
				note: 'Was "Geklärt" (clarified); matches the "Erledigen" action.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.resolved-by',
		english: 'Resolved by {name}',
		translations: {
			nl: {
				value: 'Opgelost door {name}',
				note: 'Placeholder name was localised ({naam}), so it never interpolated at runtime.',
			},
			sv: {
				value: 'Löst av {name}',
				note: 'Placeholder name was localised ({namn}), so it never interpolated at runtime.',
			},
			id: {
				value: 'Diselesaikan oleh {name}',
				note: 'Placeholder name was localised ({nama}), so it never interpolated at runtime.',
			},
			no: {
				value: 'Løst av {name}',
				note: 'Placeholder name was localised ({navn}), so it never interpolated at runtime.',
			},
			el: {
				value: 'Επιλύθηκε από {name}',
				note: 'Placeholder name was localised ({όνομα}), so it never interpolated at runtime.',
			},
			da: {
				value: 'Løst af {name}',
				note: 'Placeholder name was localised ({navn}), so it never interpolated at runtime.',
			},
			kn: {
				value: '{name} ಅವರಿಂದ ಪರಿಹರಿಸಲಾಗಿದೆ',
				note: 'Placeholder name was localised ({ಹೆಸರು}), so it never interpolated at runtime.',
			},
		},
	},
	{
		project: 'sdk',
		key: 'comments.stack-label',
		english: '{count} comments at this spot',
		translations: {
			'gu-in': {
				value: 'આ સ્થાન પર {count} ટિપ્પણીઓ',
				note: 'Placeholder name was localised ({ગણતરી}), so it never interpolated at runtime.',
			},
		},
	},
	// pt-PT batch: Google's Portuguese model outputs Brazilian Portuguese, so most
	// machine-translated pt-pt strings arrived as pt-BR (vocabulary: arquivo/ficheiro,
	// gerenciar/gerir, usuário/utilizador; grammar: "estamos trabalhando"/"estamos a
	// trabalhar", "Tem certeza"/"Tem a certeza"). Reported by a community member.
	{
		project: 'dotcom',
		key: '04a2dd56d6',
		english: 'Invite teammates',
		translations: {
			'pt-pt': {
				value: 'Convide os seus colegas de equipa',
				note: 'Was "equipe", the pt-BR spelling; pt-PT is "equipa".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '05f43078e9',
		english:
			'You have reached the maximum number of workspaces. You need to delete old workspaces before creating new ones.',
		translations: {
			'pt-pt': {
				value:
					'Atingiu o número máximo de espaços de trabalho. É necessário eliminar os espaços de trabalho antigos antes de criar novos.',
				note: 'Was pt-BR ("Você atingiu", "excluir"); pt-PT drops the pronoun and uses "eliminar" for delete.',
			},
		},
	},
	{
		project: 'dotcom',
		key: '0a91f7fa87',
		english:
			'This file has reached its size limit and changes might no longer be saved. Remove some content or start a new file.',
		translations: {
			'pt-pt': {
				value:
					'Este ficheiro atingiu o limite de tamanho e as alterações podem deixar de ser guardadas. Remova algum conteúdo ou crie um novo ficheiro.',
				note: 'Was pt-BR ("arquivo", "salvas"); pt-PT uses "ficheiro" and "guardadas".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '12a6766ba1',
		english: 'Unpin file',
		translations: {
			'pt-pt': {
				value: 'Desafixar ficheiro',
				note: 'Was "arquivo", the pt-BR word for files; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '2e2b3c700b',
		english: 'Include link to current file',
		translations: {
			'pt-pt': {
				value: 'Incluir link para o ficheiro atual',
				note: 'Was "arquivo", the pt-BR word for files; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '2de510be71',
		english:
			'Regenerating replaces the current invite link with a new one. Anyone using the old link will need the new one to join.',
		translations: {
			'pt-pt': {
				value:
					'A regeneração substitui o link de convite atual por um novo. Qualquer pessoa que estiver a usar o link antigo precisará do novo para participar.',
				note: 'Was the pt-BR progressive "estiver usando"; pt-PT uses "estiver a usar".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '34e34c43ec',
		english: 'Manage',
		translations: {
			'pt-pt': {
				value: 'Gerir',
				note: 'Was "Gerenciar", the pt-BR verb; pt-PT is "Gerir".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '454aad3b3c',
		english: 'Are you sure you want to delete <strong>[%1$s:fileName]</strong>?',
		translations: {
			'pt-pt': {
				value: 'Tem a certeza de que pretende eliminar <strong>[%1$s:fileName]</strong>?',
				note: 'Was pt-BR ("Tem certeza", "deseja excluir"); pt-PT is "Tem a certeza de que pretende eliminar".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '477df802ca',
		english: 'To continue editing please copy the file to your files.',
		translations: {
			'pt-pt': {
				value: 'Para continuar a editar, copie o ficheiro para os seus ficheiros.',
				note: 'Was pt-BR ("o arquivo", "pasta de arquivos"); pt-PT uses "ficheiro(s)".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '47f493a590',
		english: 'Pin file',
		translations: {
			'pt-pt': {
				value: 'Afixar ficheiro',
				note: 'Was "Arquivo PIN" — "Pin" read as a PIN code; pairs with "Desafixar ficheiro" (Unpin file).',
			},
		},
	},
	{
		project: 'dotcom',
		key: '4d0d3ddec9',
		english: 'This site uses cookies to make the app work and to collect analytics.',
		translations: {
			'pt-pt': {
				value:
					'Este site utiliza cookies para fazer a aplicação funcionar e recolher dados analíticos.',
				note: 'Was pt-BR ("aplicativo", "coletar análises"); pt-PT uses "aplicação" and "recolher".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '51317dcad5',
		english: 'This is your private workspace. Create a new workspace to invite teammates.',
		translations: {
			'pt-pt': {
				value:
					'Este é o seu espaço de trabalho privado. Crie um novo espaço de trabalho para convidar colegas de equipa.',
				note: 'Was "equipe", the pt-BR spelling; pt-PT is "equipa".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '542248f0ba',
		english: 'This file is now read-only',
		translations: {
			'pt-pt': {
				value: 'Este ficheiro é agora apenas de leitura.',
				note: 'Was pt-BR ("arquivo", "somente leitura"); pt-PT reads "apenas de leitura".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '5bec508475',
		english: 'Old browser detected. Please update your browser to use this app.',
		translations: {
			'pt-pt': {
				value: 'Navegador antigo detetado. Atualize o seu navegador para utilizar esta aplicação.',
				note: 'Was pt-BR ("detectado", "aplicativo"); pt-PT spells "detetado" and uses "aplicação".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '60a68c29d6',
		english: 'Sign in to comment',
		translations: {
			'pt-pt': {
				value: 'Inicie sessão para comentar',
				note: 'Was "Faça login", the pt-BR idiom; pt-PT uses "iniciar sessão".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '681e10aecb',
		english: 'New file',
		translations: {
			'pt-pt': {
				value: 'Novo ficheiro',
				note: 'Was "arquivo", the pt-BR word for files; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '694f82ed9d',
		english: 'Delete workspace',
		translations: {
			'pt-pt': {
				value: 'Eliminar espaço de trabalho',
				note: 'Was "Excluir", the pt-BR verb for delete; pt-PT uses "Eliminar".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '74ff4bad28',
		english: 'No files found',
		translations: {
			'pt-pt': {
				value: 'Nenhum ficheiro encontrado',
				note: 'Was "arquivo", the pt-BR word for files; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '752b79f137',
		english:
			'You have reached the maximum number of files. You need to delete old files before creating new ones.',
		translations: {
			'pt-pt': {
				value:
					'Atingiu o número máximo de ficheiros. É necessário eliminar os ficheiros antigos antes de criar novos.',
				note: 'Was pt-BR ("Você atingiu", "excluir", "arquivos"); pt-PT drops the pronoun and uses "eliminar" and "ficheiros".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '761e93ede9',
		english: 'Manage cookies',
		translations: {
			'pt-pt': {
				value: 'Gerir cookies',
				note: 'Was "Gerenciar", the pt-BR verb; pt-PT is "Gerir".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '764671e008',
		english: 'Chat with us on Discord',
		translations: {
			'pt-pt': {
				value: 'Fale connosco no Discord',
				note: 'Was pt-BR ("Converse conosco"); pt-PT spells "connosco".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '7827371d1a',
		english:
			'This anonymous tldraw multiplayer file is now read-only. To continue editing, please sign in and copy it to your files.',
		translations: {
			'pt-pt': {
				value:
					'Este ficheiro multiplayer anónimo do tldraw é agora apenas de leitura. Para continuar a editar, inicie sessão e copie-o para os seus ficheiros.',
				note: 'Was pt-BR throughout ("arquivo", "anônimo", "somente leitura", "continuar editando", "faça login").',
			},
		},
	},
	{
		project: 'dotcom',
		key: '7b1329f5ca',
		english: 'User manual',
		translations: {
			'pt-pt': {
				value: 'Manual do utilizador',
				note: 'Was "usuário", the pt-BR word for user; pt-PT is "utilizador".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '81666c6e4a',
		english: 'Are you sure you want to forget <strong>[%1$s:fileName]</strong>?',
		translations: {
			'pt-pt': {
				value: 'Tem a certeza de que pretende esquecer <strong>[%1$s:fileName]</strong>?',
				note: 'Was pt-BR ("Tem certeza", "deseja"); pt-PT is "Tem a certeza de que pretende".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '815e116a2e',
		english:
			'Have a bug, issue, or idea for tldraw? Let us know! Fill out this form and we will follow up over email if needed. You can also <discord>chat with us on Discord</discord> or <github>submit an issue on GitHub</github>.',
		translations: {
			'pt-pt': {
				value:
					'Tem um bug, problema ou ideia para o tldraw? Diga-nos! Preencha este formulário e entraremos em contacto por e-mail, se necessário. Também pode <discord>falar connosco no Discord</discord> ou <github>submeter um problema no GitHub</github>.',
				note: 'Was pt-BR throughout ("Conte para a gente", "contato", "conversar conosco"); pt-PT reads "Diga-nos", "contacto", "falar connosco".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '86353d2c41',
		english: 'Added [%1$s:total] .tldr files.',
		translations: {
			'pt-pt': {
				value: 'Adicionados [%1$s:total] ficheiros .tldr.',
				note: 'Was "arquivos", the pt-BR word for files; pt-PT uses "ficheiros".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '86c66437fd',
		english: 'Rename file',
		translations: {
			'pt-pt': {
				value: 'Renomear ficheiro',
				note: 'Was "arquivo", the pt-BR word for files; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '90646db02d',
		english:
			'Are you sure you want to delete <strong>[%1$s:workspaceName]</strong>? This action cannot be undone.',
		translations: {
			'pt-pt': {
				value:
					'Tem a certeza de que pretende eliminar <strong>[%1$s:workspaceName]</strong>? Esta ação não pode ser desfeita.',
				note: 'Was pt-BR ("Tem certeza", "deseja excluir"); pt-PT is "Tem a certeza de que pretende eliminar".',
			},
		},
	},
	{
		project: 'dotcom',
		key: '9e93c98d88',
		english: 'Opt out',
		translations: {
			'pt-pt': {
				value: 'Recusar',
				note: 'Was "Excluir" ("Delete") — a mistranslation; this button declines analytics cookies.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'a0da245992',
		english: "Export the content as a .tldr file: Select 'Download' in the top left menu.",
		translations: {
			'pt-pt': {
				value:
					'Exporte o conteúdo como um ficheiro .tldr: selecione "Download" no menu superior esquerdo.',
				note: 'Was "arquivo"; keeps "Download" verbatim because that menu label is untranslated in pt-PT.',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'a8873770ab',
		english: 'File is getting large',
		translations: {
			'pt-pt': {
				value: 'O ficheiro está a ficar grande.',
				note: 'Was the pt-BR progressive "O arquivo está ficando grande"; pt-PT uses "está a ficar".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'ab0df9ba36',
		english: 'File limit reached',
		translations: {
			'pt-pt': {
				value: 'Limite do ficheiro atingido',
				note: 'Was "Limite de arquivo"; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'b028909917',
		english: 'Guest user',
		translations: {
			'pt-pt': {
				value: 'Utilizador convidado',
				note: 'Was "Usuário", the pt-BR word for user; pt-PT is "Utilizador".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'b2c3c2e30c',
		english: 'File is full',
		translations: {
			'pt-pt': {
				value: 'O ficheiro está cheio',
				note: 'Was "arquivo", the pt-BR word for files; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'bbbcefd7ce',
		english:
			'{total, plural, one {Uploading .tldr file…} other {Uploading {uploaded} of {total} .tldr files…}}',
		translations: {
			'pt-pt': {
				value: {
					one: 'A carregar ficheiro .tldr…',
					other: 'A carregar [%1$s:uploaded] de [%2$s:total] ficheiros .tldr…',
				},
				note: 'Was pt-BR ("Carregando", "arquivos"); pt-PT uses "A carregar" and "ficheiros".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'c17466812d',
		english: 'Manage workspace',
		translations: {
			'pt-pt': {
				value: 'Gerir espaço de trabalho',
				note: 'Was "Gerenciar", the pt-BR verb; pt-PT is "Gerir".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'ce0547606c',
		english:
			'This file is approaching its size limit. Consider removing some content or starting a new file.',
		translations: {
			'pt-pt': {
				value:
					'Este ficheiro está a aproximar-se do limite de tamanho. Considere remover algum conteúdo ou criar um novo ficheiro.',
				note: 'Was pt-BR ("arquivo", "está se aproximando"); pt-PT uses "ficheiro" and "está a aproximar-se".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'f09b16bc5f',
		english:
			'We use cookies to keep you logged in, to sync your files, and to collect analytics to help us improve tldraw.',
		translations: {
			'pt-pt': {
				value:
					'Utilizamos cookies para manter a sua sessão iniciada, sincronizar os seus ficheiros e recolher dados analíticos que nos ajudam a melhorar o tldraw.',
				note: 'Was pt-BR ("mantê-lo conectado", "arquivos", "coletar análises"); pt-PT reads "manter a sessão iniciada", "ficheiros", "recolher dados analíticos".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'f0e8bff6f9',
		english: 'User settings',
		translations: {
			'pt-pt': {
				value: 'Definições do utilizador',
				note: 'Was pt-BR ("Configurações do usuário"); pt-PT is "Definições do utilizador".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'f2569594b2',
		english: 'We use these cookies to save your files and settings.',
		translations: {
			'pt-pt': {
				value: 'Utilizamos estes cookies para guardar os seus ficheiros e definições.',
				note: 'Was pt-BR ("salvar seus arquivos e configurações"); pt-PT uses "guardar", "ficheiros", "definições".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'fc9d47046b',
		english: 'Are you sure you want to leave this workspace?',
		translations: {
			'pt-pt': {
				value: 'Tem a certeza de que pretende sair deste espaço de trabalho?',
				note: 'Was pt-BR ("Tem certeza", "deseja"); pt-PT is "Tem a certeza de que pretende".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'ff2fefd3c6',
		english: 'Are you sure you want to remove [%1$s:name] from this workspace?',
		translations: {
			'pt-pt': {
				value: 'Tem a certeza de que pretende remover [%1$s:name] deste espaço de trabalho?',
				note: 'Was pt-BR ("Tem certeza", "deseja"); pt-PT is "Tem a certeza de que pretende".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'ff52811b98',
		english: 'Create a free account to save your files and tldraw with your teammates.',
		translations: {
			'pt-pt': {
				value:
					'Crie uma conta gratuita para guardar os seus ficheiros e desenhar com os seus colegas de equipa.',
				note: 'Was pt-BR ("salvar", "arquivos", "compartilhar", "equipe"); pt-PT uses "guardar", "ficheiros", "desenhar", "equipa".',
			},
		},
	},
	{
		project: 'dotcom',
		key: 'ffcd73e997',
		english: 'Import file…',
		translations: {
			'pt-pt': {
				value: 'Importar ficheiro…',
				note: 'Was "arquivo", the pt-BR word for files; pt-PT uses "ficheiro".',
			},
		},
	},
	{
		project: 'sdk',
		key: 'assets.files.amount-too-many',
		english: 'Too many files',
		translations: {
			'pt-pt': {
				value: 'Demasiados ficheiros',
				note: 'Was pt-BR ("Muitos arquivos"); pt-PT reads "Demasiados ficheiros".',
			},
		},
	},
	{
		project: 'sdk',
		key: 'people-menu.anonymous-user',
		english: 'New user',
		translations: {
			'pt-pt': {
				value: 'Novo utilizador',
				note: 'Was "usuário", the pt-BR word for user; pt-PT is "utilizador".',
			},
		},
	},
	// Note: the workspace-invite scramble found in the auto-generated i18n PR lived on
	// key a8c9ad7ea5, which no longer exists in Lokalise — the English string was edited
	// (now key 23dcace54a, "...Create a free account to continue.") and is currently
	// untranslated. Re-review those invite strings after the next translation order.
	// When adding placeholder-bearing fixes, write `value` in Lokalise's native
	// format, e.g. `[%1$s:workspaceName]`. Validation matches it against the ICU
	// `{workspaceName}` that the export produces by variable name, so the two forms
	// line up — but the value written to Lokalise must be the native one.
]

function formatError(error: unknown) {
	if (error instanceof Error) {
		return error.stack ?? error.message
	}

	try {
		return JSON.stringify(error, null, 2)
	} catch {
		return String(error)
	}
}

function getEnv(name: string) {
	const value = process.env[name]
	if (!value) throw new Error(`Missing required env var: ${name}`)
	return value
}

/** Lokalise uses ISO codes like `ko_KR`; the repo uses `ko-kr`. Normalize both for matching. */
function normalizeIso(iso: string) {
	return iso.toLowerCase().replace(/_/g, '-')
}

/** A key name is per-platform in Lokalise; the hashed key is identical across platforms. */
function keyNameMatches(key: Key, name: string) {
	const keyName = key.key_name as unknown
	if (typeof keyName === 'string') return keyName === name
	if (keyName && typeof keyName === 'object') return Object.values(keyName).includes(name)
	return false
}

/**
 * Reduce a placeholder or tag to a format-independent identity, so the same
 * variable matches across the formats this pipeline mixes:
 *   - ICU `{workspaceName}` — what the Lokalise export produces (used in `english`)
 *   - Lokalise native `[%1$s:workspaceName]` — preferred in corrected `value`s
 *   - bare printf `%1$s` / `%s` / `%d` / `%@`
 * Named placeholders collapse to `var:<name>`; unnamed positional ones to
 * `pos:<n>` (or `pos:<order>` when unindexed). HTML tags become `tag:<name>` /
 * `tag:/<name>`, attributes ignored, so open/close balance is still checked.
 */
function placeholderIdentities(text: string): string[] {
	const ids: string[] = []
	let unnamed = 0

	// HTML tags: <b> / </b> / <br/>, attributes ignored.
	for (const m of text.matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g)) {
		ids.push(`tag:${m[1]}${m[2].toLowerCase()}`)
	}

	// Lokalise placeholders `[% … ]`: named -> var:<name>, otherwise positional.
	// Strip them so the bare-printf scan below doesn't also match their insides.
	const stripped = text.replace(/\[%([^\]]*)\]/g, (_full, inner: string) => {
		const named = inner.match(/:([a-zA-Z0-9_]+)\s*$/)
		if (named) {
			ids.push(`var:${named[1]}`)
		} else {
			const indexed = inner.match(/(\d+)\$/)
			ids.push(indexed ? `pos:${indexed[1]}` : `pos:${unnamed++}`)
		}
		return ''
	})

	// ICU placeholders `{name}`.
	for (const m of stripped.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) ids.push(`var:${m[1]}`)

	// Bare printf specifiers: `%1$s` (indexed) and `%s` / `%d` / `%@` (unindexed).
	for (const m of stripped.matchAll(/%(\d+)\$?[sd@]/g)) ids.push(`pos:${m[1]}`)
	for (const _m of stripped.matchAll(/%[sd@]/g)) ids.push(`pos:${unnamed++}`)

	return ids
}

/** Placeholder/tag identities present in `required` but missing (or under-counted) in `candidate`. */
function missingPlaceholders(required: string, candidate: string): string[] {
	const have = new Map<string, number>()
	for (const id of placeholderIdentities(candidate)) {
		have.set(id, (have.get(id) ?? 0) + 1)
	}
	const missing: string[] = []
	for (const id of placeholderIdentities(required)) {
		const count = have.get(id) ?? 0
		if (count <= 0) missing.push(id)
		else have.set(id, count - 1)
	}
	return missing
}

/** Flatten a plural map to one string so placeholder checks see every form. */
function fixValueText(value: FixValue) {
	return typeof value === 'string' ? value : Object.values(value).join(' ')
}

function parseProjectArg(): ProjectName {
	const arg = process.argv.find((a) => a.startsWith('--project='))?.split('=')[1]
	if (arg === 'sdk' || arg === 'dotcom') return arg
	throw new Error(
		`Pass --project=sdk or --project=dotcom. A run targets one Lokalise project at a time.`
	)
}

async function i18nFixStrings() {
	const apply = process.argv.includes('--apply')
	const markReviewed = process.argv.includes('--mark-reviewed')
	const project = parseProjectArg()
	const projectId = getEnv(PROJECT_ENV_VAR[project])
	const apiKey = getEnv('LOKALISE_API_TOKEN')
	const lokaliseApi = new LokaliseApi({ apiKey })

	const fixes = FIXES.filter((fix) => fix.project === project)
	console.log(
		apply
			? `Applying ${project} translation fixes to Lokalise...`
			: `Dry run for ${project} — pass --apply to write these fixes to Lokalise.`
	)

	let applied = 0
	let alreadyCorrect = 0
	let skipped = 0
	let refused = 0
	const failed: string[] = []

	for (const fix of fixes) {
		// Lokalise allows six requests a second per token, and a full run makes one
		// lookup per key plus one write per corrected translation. Space them out so
		// a large batch doesn't die halfway through on a 429.
		await sleep(REQUEST_INTERVAL_MS)
		const { items } = await lokaliseApi.keys().list({
			project_id: projectId,
			filter_keys: fix.key,
			include_translations: 1,
			limit: 100,
		})
		const key = items.find((item) => keyNameMatches(item, fix.key))
		if (!key) {
			console.warn(`\n⚠ Key ${fix.key} ("${fix.english}") not found in project — skipping.`)
			skipped += Object.keys(fix.translations).length
			continue
		}

		console.log(`\n${fix.key} — "${fix.english}"`)
		for (const [locale, { value, note }] of Object.entries(fix.translations)) {
			const translation = key.translations.find(
				(t) => normalizeIso(t.language_iso) === normalizeIso(locale)
			)
			if (!translation) {
				console.warn(`  ${locale}: no translation found in Lokalise — skipping.`)
				skipped++
				continue
			}

			const current = translation.translation
			const currentText = typeof current === 'string' ? current : JSON.stringify(current)
			const valueText = typeof value === 'string' ? value : JSON.stringify(value)
			if (currentText === valueText) {
				console.log(`  ${locale}: already correct.`)
				alreadyCorrect++
				continue
			}

			const missing = missingPlaceholders(fix.english, fixValueText(value))
			if (missing.length) {
				console.error(
					`  ${locale}: REFUSED — corrected value is missing placeholder(s)/tag(s): ${missing.join(', ')}`
				)
				refused++
				continue
			}

			console.log(`  ${locale}:`)
			console.log(`    - ${currentText}`)
			console.log(`    + ${valueText}`)
			console.log(`    why: ${note}`)

			if (apply) {
				await sleep(REQUEST_INTERVAL_MS)
				try {
					await lokaliseApi.translations().update(
						translation.translation_id,
						{
							// Plural keys take a map of plural forms here, which the SDK's
							// `string` type doesn't describe but the API accepts.
							translation: value as string,
							...(markReviewed ? { is_reviewed: true, is_unverified: false } : {}),
						},
						{ project_id: projectId }
					)
					applied++
				} catch (error) {
					// One rejected write shouldn't abandon the rest of the batch — a
					// reviewed translation comes back as a 409 "Translation is locked",
					// and the run is far more useful having applied everything else.
					const message = error instanceof Error ? error.message : JSON.stringify(error)
					console.error(`    FAILED to write ${locale}: ${message}`)
					failed.push(`${fix.key} ${locale}: ${message}`)
				}
			}
		}
	}

	console.log(
		`\nSummary: ${apply ? `updated ${applied}` : 'dry run (no changes written)'}, ` +
			`already correct ${alreadyCorrect}, skipped ${skipped}, refused ${refused}, ` +
			`failed ${failed.length}.`
	)
	if (failed.length) {
		console.error(`\n${failed.length} translation(s) could not be written:`)
		for (const line of failed) console.error(`  ${line}`)
	}
	if (!apply) {
		console.log('Re-run with --apply to write these changes to Lokalise.')
	}
	if (refused > 0 || failed.length > 0) {
		process.exit(1)
	}
}

i18nFixStrings().catch((error) => {
	console.error('Failed to fix i18n strings:')
	console.error(formatError(error))
	process.exit(1)
})
