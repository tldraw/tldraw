import { Tldraw } from '@tldraw/tldraw'
import '@tldraw/tldraw/tldraw.css'

export default function MultipleExample() {
	return (
		<div
			style={{
				backgroundColor: '#fff',
				padding: 32,
			}}
		>
			<h2>First Example</h2>
			<p>This is the second example.</p>
			<div style={{ width: '100%', height: '600px', padding: 32 }} tabIndex={-1}>
				<Tldraw persistenceKey="steve" autoFocus />
			</div>

			<textarea defaultValue="type in me" style={{ margin: 10 }}></textarea>

			<h2>Second Example</h2>
			<p>This is the second example.</p>
			<div style={{ width: '100%', height: '600px' }} tabIndex={-1}>
				<Tldraw persistenceKey="david" autoFocus={false} />
			</div>

			<div
				style={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column' }}
			>
				<article style={{ maxWidth: 600 }}>
					<h1>White Board</h1>
					<h2>Chapter 1: The First Strokes</h2>
					<p>
						The fluorescent lights flickered overhead as John sat hunched over his desk, his fingers
						tapping rhythmically on the keyboard. He was a software developer, and tonight, he had a
						peculiar mission. A mission that would take him deep into the labyrinthine world of web
						development. John had stumbled upon a new whiteboard library called "tldraw," a
						seemingly simple tool that promised to revolutionize collaborative drawing on the web.
						Little did he know that this discovery would set off a chain of events that would
						challenge his skills, test his perseverance, and blur the line between reality and
						imagination.
					</p>
					<p>
						With a newfound sense of excitement, John began integrating "tldraw" into his latest
						project. As lines of code danced across his screen, he imagined the possibilities that
						lay ahead. The potential to create virtual spaces where ideas could be shared, concepts
						could be visualized, and teams could collaborate seamlessly from different corners of
						the world. It was a dream that seemed within reach, a vision of a future where
						creativity and technology merged into a harmonious symphony.
					</p>
					<p>
						As the night wore on, John's mind became consumed with the whiteboard library. He
						couldn't help but marvel at its elegance and simplicity. With each stroke of his
						keyboard, he felt a surge of inspiration, a connection to something greater than
						himself. It was as if the lines of code he was writing were transforming into a digital
						canvas, waiting to be filled with the strokes of imagination. In that moment, John
						realized that he was not just building a tool, but breathing life into a new form of
						expression. The whiteboard was no longer just a blank slate; it had become a portal to a
						world where ideas could flourish and dreams could take shape.
					</p>
					<p>
						Little did John know, this integration of "tldraw" was only the beginning. It would lead
						him down a path filled with unforeseen challenges, where he would confront his own
						limitations and question the very nature of creation. The journey ahead would test his
						resolve, pushing him to the edge of his sanity. And as he embarked on this perilous
						adventure, he could not shake the feeling that the whiteboard held secrets far beyond
						his understanding. Secrets that would unfold before his eyes, one stroke at a time.
					</p>
				</article>
			</div>
		</div>
	)
}
