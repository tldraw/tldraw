# Writing style guide

This document defines the voice and style for all tldraw writing. It applies to documentation, release notes, and any other written content.

## Core identity

**Expert-to-developer guidance**: We write as a knowledgeable colleague explaining a system they helped build. We're confident, practical, and focused on getting developers to working code quickly.

The overall feeling is: _"Here's how this works, here's exactly how to use it, and here's working code to prove it."_

## Tone characteristics

### What we are

| Trait                  | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| **Confident**          | We make clear, direct assertions without hedging                   |
| **Upfront**            | We present solutions early rather than showing what _doesn't_ work |
| **Pragmatic**          | We focus on "here's how to do it" rather than theory               |
| **Helpful**            | We anticipate developer needs and provide escape hatches           |
| **Honest**             | We're transparent about limitations and work-in-progress           |
| **Warm but efficient** | We have personality without being chatty                           |

### What we're not

- **Not dry or academic** — we have warmth and occasional personality
- **Not overly chatty** — we respect the reader's time
- **Not condescending** — we assume intelligence and competence
- **Not corporate** — we're human, sometimes playful

## Voice examples

### Confidence without hedging

**Do:**

> The Editor class is the main way of controlling tldraw's editor.

> By design, the Editor's surface area is very large.

> Custom shapes are shapes that were created by you or someone you love.

**Don't:**

> The Editor class can be used to control tldraw's editor.

> The Editor's surface area might seem large.

> Custom shapes are shapes that may have been created by developers.

### Pragmatic directness

**Do:**

> Need to create some shapes? Use `Editor#createShapes`. Need to delete them? Use `Editor#deleteShapes`.

> In tldraw, a shape is something that can exist on the page, like an arrow, an image, or some text.

> The sync demo is great for prototyping but you should not use it in production.

**Don't:**

> The following section describes the various methods available for creating and deleting shapes in the editor.

> A shape can be defined as an entity that exists within the canvas space.

> Production usage of the sync demo is discouraged.

### Honesty about limitations

**Do:**

> There are some features that we have not provided and you might want to add yourself.

> While we're working on docs for this part of the project, refer to our examples.

> We don't guarantee server backwards compatibility forever.

**Don't:**

> This comprehensive solution handles most scenarios.

> Documentation is forthcoming.

> Backwards compatibility is maintained between versions.

### Stay concrete

Avoid florid language, extended metaphors, and theoretical examples. We explain with real code and real scenarios, not imagination.

**Do:**

> The store holds all the data for your document.

> Let's create a custom shape for a card with a title and description.

> The editor manages state changes through its store.

**Don't:**

> Think of the store as a river of data, flowing through your application, carrying shapes like leaves on a current.

> Imagine you're building a spaceship dashboard with custom controls...

> The editor orchestrates a symphony of state changes...

Short clarifying comparisons are fine—"shapes are just records (JSON objects)"—but don't reach for extended metaphors when plain language works. Avoid distracting hypothetical scenarios in your prose.

## Avoiding AI writing tells

AI-generated text has recognizable patterns. Avoid these to keep our writing sounding human. For a comprehensive catalog, see [Wikipedia: Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing).

### Hollow importance claims

AI loves to emphasize significance without saying anything concrete. These phrases are red flags:

- "serves as a testament to"
- "plays a vital/crucial/significant role"
- "underscores its importance"
- "watershed moment," "key turning point," "pivotal moment"
- "deeply rooted," "profound heritage"
- "rich history," "enduring legacy"

**Don't:**

> The store plays a crucial role in tldraw's architecture, serving as a testament to the power of reactive state management.

**Do:**

> The store holds all shapes, bindings, and other records. The store is reactive: when data changes, the UI updates automatically.

### Trailing gerund phrases

**This is one of the most common AI writing patterns. Actively hunt for and eliminate trailing gerunds.**

AI ends sentences with gerund clauses (-ing phrases) that claim importance without substance:

- "...emphasizing the significance of X"
- "...reflecting the continued relevance of Y"
- "...highlighting the importance of Z"
- "...ensuring a seamless experience"
- "...underscoring its commitment to quality"

**Don't:**

> The editor batches updates automatically, ensuring optimal performance while highlighting the importance of reactive state management.

**Do:**

> The editor batches updates automatically. This keeps renders fast even when many shapes change at once.

**Even neutral trailing gerunds are a problem.** They weaken sentences by burying the point at the end, making prose feel monotonous and AI-generated. This isn't just about avoiding hollow importance claims—it's about sentence structure.

Common neutral trailing gerunds to eliminate:

- "...allowing you to X"
- "...enabling users to X"
- "...making it easy to X"
- "...giving you X"
- "...providing X"
- "...creating X"
- "...resulting in X"
- "...causing X to Y"

**Don't:**

> The store is reactive, allowing you to subscribe to changes.

> When `shrink` is greater than zero, the stroke width also decreases during fade-out, creating a smooth disappearance effect.

> The editor exposes methods for shape manipulation, making it easy to create complex diagrams.

**Do:**

> The store is reactive. You can subscribe to changes.

> When `shrink` is greater than zero, the stroke width also decreases during fade-out. This creates a smooth disappearance effect.

> The editor exposes methods for shape manipulation. You can use these to create complex diagrams.

Or lead with what matters:

> Set `shrink` above zero for a smooth disappearance effect—the stroke width decreases during fade-out.

> You can create complex diagrams using the editor's shape manipulation methods.

**The fix is simple**: Split into two sentences, or restructure so the important information comes first. When you see a comma followed by an -ing word near the end of a sentence, that's your signal to rewrite.

### Formulaic transitions

These transitions are overused by AI and often unnecessary:

- "Moreover," "Furthermore," "Additionally,"
- "It's important to note that..."
- "It is worth mentioning that..."
- "On the other hand,"
- "In addition to this,"

Usually you can just delete these and the sentence is stronger. If you need a transition, use a shorter one ("But," "And," "Also,") or restructure.

**Don't:**

> The editor manages all state changes. Moreover, it provides a reactive system for updates. Furthermore, it handles undo/redo automatically.

**Do:**

> The editor manages all state changes. It's reactive: when state changes, dependent values update automatically. It also handles undo/redo.

### The rule of three

AI overuses three-part lists. Real writing has lists of two, or four, or seven items. If you find yourself writing exactly three things, ask whether that's actually the right number or just a pattern.

**Don't:**

> The editor is fast, flexible, and powerful.

> This gives you control, clarity, and confidence.

**Do:**

> The editor is fast and flexible.

> This gives you precise control over rendering.

### Promotional language

AI picks up marketing speak from its training data. We're writing technical content, not ad copy:

- "breathtaking," "stunning," "beautiful"
- "seamless," "frictionless," "effortless"
- "robust," "comprehensive," "cutting-edge"
- "empowers developers to..."
- "unlock the full potential of..."

**Don't:**

> Tldraw empowers developers to unlock the full potential of infinite canvas experiences with a robust and comprehensive API.

**Do:**

> Tldraw gives you an infinite canvas with a large API surface. You can control almost everything.

### Em dash overuse

AI writing often features multiple em dashes where a comma or period would be more natural. One em dash per paragraph is fine; several is a red flag. Also avoid dramatic formulations that call for an em dash.

LLMs especially use em dashes in formulaic, punched-up ways—often mimicking sales copy by over-emphasizing clauses. They also use em dashes where humans would use commas, parentheses, or colons.

**Don't:**

> It's not just a history manager—it's a way to track changes across time.

> The store is reactive—it notifies subscribers—and it's fully typed—with TypeScript.

**Do:**

> You can also use the history manager to track changes across time.

> The store is reactive: it notifies subscribers when data changes. All records are fully typed.

### Negation parallelism

The "It's not X, it's Y" structure is an AI signature. Real writing just says what something is.

**Don't:**

> It's not just a canvas—it's a complete editing experience.

> The editor isn't simply a state container; it's a reactive system.

**Do:**

> The editor is a reactive system that manages all document state.

### Overused AI vocabulary

Certain words appear disproportionately in LLM output. Avoid these unless they're genuinely the right word:

| Avoid        | Use instead                |
| ------------ | -------------------------- |
| delve (into) | explore, examine, look at  |
| pivotal      | important, key, critical   |
| underscore   | emphasize, show, highlight |
| leverage     | use                        |
| utilize      | use                        |
| multifaceted | complex, varied            |
| nuanced      | subtle, detailed           |
| foster       | encourage, create          |
| bolster      | strengthen, support        |
| spearhead    | lead                       |
| paradigm     | model, approach            |
| synergy      | (usually delete entirely)  |

These words aren't wrong, but their overuse signals AI authorship. If you find yourself reaching for them, consider whether a simpler word works.

### Bullet points with bolded headers

In prose writing, this format is a ChatGPT signature:

**Don't:**

> - **Reactive updates**: The store automatically notifies subscribers when data changes.
> - **Type safety**: All records are fully typed with TypeScript.
> - **Persistence**: Data can be saved to IndexedDB or synced to a server.

**Do:**

> The store is reactive: it automatically notifies subscribers when data changes. All records are fully typed. You can persist data to IndexedDB or sync it to a server.

This format is fine for reference material (API docs, style guides, changelogs) where scanability matters more than flow. Use a table if you have genuinely parallel information to present.

### Regression to the mean

AI replaces specific, unusual details with generic positive-sounding language. LLMs are trained on text where notable things are described with important-sounding words, so they tend to smooth over unique facts in favor of statistical averages.

**Don't:**

> The arrow tool is a powerful and versatile feature that enables users to create professional-looking diagrams.

> Steve is a visionary leader who has made significant contributions to the field.

**Do:**

> The arrow tool draws arrows between shapes. Arrows can have different heads, labels, and curve styles.

> Steve invented the train-coupling device used in most modern rail systems.

The fix: preserve specific facts. If you don't know the specifics, research them or omit the claim entirely. Vague importance claims add nothing.

### Uniform sentence structure

AI defaults to sentences of similar length and paragraphs of similar size. Real writing has rhythm—short punchy sentences, then longer ones with more detail. Paragraphs vary based on content, not formula.

**Don't:**

> The editor manages document state. The store holds shape records. Bindings connect related shapes. Tools handle user interactions.

**Do:**

> The editor manages all document state. It holds shapes in a reactive store—when data changes, the UI updates automatically. Tools handle user interaction: each tool is a state machine that responds to pointer and keyboard events.

If your prose feels monotonous, vary your sentence lengths. Start some sentences with the subject, others with a clause. Let the content dictate structure.

## Grammar and mechanics

### Pronouns

**Use "you" for direct address:**

> You can access the editor in two ways.

> You can change the current active tool using `editor.setCurrentTool`.

> You should make sure that there's only ever one `TLSocketRoom` globally.

**Use "we" for recommendations and team perspective:**

> We've found it best to create the store, set its data, and then pass the store into the editor.

> We recommend the tldraw sync packages for collaboration.

**Use "the SDK" or "the editor" when describing what the software does:**

> The SDK has several features to support collaboration.

> The editor provides history methods for undo and redo.

> The editor's history manager handles history. It uses "stacks" for undos and redos.

Don't say "we support X" when you mean "the editor supports X"—it conflates the team with the software.

**Avoid:**

- First-person singular ("I recommend...")
- Passive constructions that obscure the actor ("It is recommended that...")

### Voice

**Active voice dominates:**

> The editor holds the raw state of the document in its store property.

> Each node will first handle the event and then pass the event to its active child state.

> Tldraw uses migrations to bring data from old snapshots up to date.

**Passive voice only when the actor genuinely doesn't matter:**

> Data is kept here as a table of JSON serializable records.

> The event is first processed in order to update its inputs.

**Tables still prefer active voice.** When describing states or behaviors in tables, make the subject act rather than be acted upon:

| Don't                                | Do                                                                |
| ------------------------------------ | ----------------------------------------------------------------- |
| "The scribble is temporarily paused" | "The manager pauses the scribble" or "Drawing pauses temporarily" |
| "The request is being processed"     | "The server processes the request"                                |
| "Points are removed from the tail"   | "The scribble removes points from its tail"                       |

### Sentence structure

**Write like a person.** Prefer short, clear sentences, but don't be robotic about it. Natural prose has rhythm—some sentences are short, others flow a bit longer. The goal is readability, not mechanical uniformity.

**Prefer:**

> In tldraw, a shape is something that can exist on the page.

> Shapes are just records (JSON objects) that sit in the store. For example, here's a shape record for a rectangle geo shape.

> When the editor receives an event, it first updates inputs and other state. Then it sends the event to the state chart.

**Avoid complex, nested constructions:**

> When the editor receives an event via its dispatch method, the event is first handled internally to update inputs and other state before being sent into the editor's state chart, where it cascades through the active states.

The problem isn't sentence length, but rather cognitive load. Break up ideas when a sentence asks the reader to hold too much in their head at once.

### Contractions

Use contractions naturally:

- it's, we've, you'll, won't, don't, can't, shouldn't

**Example:**

> It's our library for fast, fault-tolerant shared document syncing, and it's what we use to power collaboration on our flagship app.

### Headings

**Always use sentence case** (not Title Case):

- "Custom shapes" not "Custom Shapes"
- "Using the editor" not "Using the Editor"
- "Camera and coordinates" not "Camera and Coordinates"

**Exception:** Proper nouns and technical names remain capitalized:

- "PostgreSQL database"
- "WebSocket connections"
- "ShapeUtil implementation"

## Code examples

### Complete and runnable first

When showing code examples, your _first_ snippet should provide a full working example. Following examples can be fragments.

**Do:**

```tsx
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'

export default function () {
	return (
		<div style={{ position: 'fixed', inset: 0 }}>
			<Tldraw persistenceKey="my-persistence-key" />
		</div>
	)
}
```

**Don't:**

```tsx
// Add persistenceKey to your Tldraw component
<Tldraw persistenceKey="..." />
```

### Comments are conversational

Use comments to provide context, not obvious descriptions:

```tsx
editor.run(
	() => {
		editor.createShapes(myShapes)
	},
	{ history: 'ignore' } // Changes won't affect undo/redo
)
```

### Show realistic data

Use meaningful example data, not placeholders:

**Do:**

```json
{
	"type": "geo",
	"props": {
		"geo": "rectangle",
		"w": 200,
		"h": 200,
		"color": "blue",
		"text": "diagram"
	}
}
```

**Don't:**

```json
{
	"type": "example-type",
	"props": {
		"prop1": "value1",
		"prop2": "value2"
	}
}
```

For IDs, use either `"shape:123" as TLShapeId` or `createShapeId("123")` to avoid TypeScript errors.

## General notes

- Do not include Claude Code attribution in written content
- American English spelling
- Avoid complicated grammar, obscure vocabulary, jokes, or cultural idioms
