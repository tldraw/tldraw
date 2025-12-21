# Voice and style guide

This is how we write at tldraw. Use it when writing new docs, reviewing existing content, or checking whether something sounds like us.

## Core identity

**Expert-to-developer guidance**: We write as a knowledgeable colleague explaining a system they helped build. We're confident, practical, and focused on getting developers to working code quickly.

The overall feeling is: _"Here's how this works, here's exactly how to use it, and here's working code to prove it."_

## Tone characteristics

### What we are

| Trait | Description |
|-------|-------------|
| **Confident** | We make clear, direct assertions without hedging |
| **Pragmatic** | We focus on "here's how to do it" rather than theory |
| **Helpful** | We anticipate developer needs and provide escape hatches |
| **Honest** | We're transparent about limitations and work-in-progress |
| **Warm but efficient** | We have personality without being chatty |

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

### Occasional warmth and personality

Appropriate places for personality:
- Code comments for non-obvious techniques
- Self-aware asides about complex topics
- The rare playful phrase when it fits naturally

**Examples from our docs:**
> Custom shapes are shapes that were created by you or someone you love.

> (Hidden HTML comment: "learn this one weird trick for transparent animated gifs. doctors hate her!!!")

> We still have work to do on the `CardShapeUtil` class, but we'll come back to it later.

### Stay concrete

Avoid florid language, extended metaphors, and theoretical examples. We explain with real code and real scenarios, not imagination.

**Don't:**
> Think of the store as a river of data, flowing through your application, carrying shapes like leaves on a current.

> Imagine you're building a spaceship dashboard with custom controls...

> The editor orchestrates a symphony of state changes...

**Do:**
> The store holds all the data for your document.

> Let's create a custom shape for a card with a title and description.

> The editor manages state changes through its store.

Similes are fine when they genuinely clarify—"shapes are just records (JSON objects)"—but don't reach for metaphor when plain language works.

## Avoiding AI writing tells

AI-generated text has recognizable patterns. Avoid these to keep our docs sounding human.

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
> The store holds all shapes, bindings, and other records. It's reactive—when data changes, the UI updates automatically.

### Trailing gerund phrases

AI ends sentences with vague gerund clauses that claim importance without substance:

- "...emphasizing the significance of X"
- "...reflecting the continued relevance of Y"
- "...highlighting the importance of Z"
- "...ensuring a seamless experience"
- "...underscoring its commitment to quality"

**Don't:**
> The editor batches updates automatically, ensuring optimal performance while highlighting the importance of reactive state management.

**Do:**
> The editor batches updates automatically. This keeps renders fast even when many shapes change at once.

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
> The editor manages all state changes. It's reactive—when state changes, dependent values update automatically. It also handles undo/redo.

### The rule of three

AI overuses three-part lists. Real writing has lists of two, or four, or seven items. If you find yourself writing exactly three things, ask whether that's actually the right number or just a pattern.

**Don't:**
> The editor is fast, flexible, and powerful.

> This gives you control, clarity, and confidence.

**Do:**
> The editor is fast and flexible.

> This gives you precise control over rendering.

### Promotional language

AI picks up marketing speak from its training data. We're writing technical docs, not ad copy:

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

Em dashes are fine—we use them—but AI uses them constantly, often where a comma or period would be more natural. If you notice several em dashes in a paragraph, try replacing some with other punctuation.

### Bullet points with bolded headers

This format is a ChatGPT signature:

**Don't:**
> - **Reactive updates**: The store automatically notifies subscribers when data changes.
> - **Type safety**: All records are fully typed with TypeScript.
> - **Persistence**: Data can be saved to IndexedDB or synced to a server.

**Do:**
> The store is reactive—it automatically notifies subscribers when data changes. All records are fully typed. You can persist data to IndexedDB or sync it to a server.

Or use a table if you genuinely have parallel information to present.

## Grammar and mechanics

### Pronouns

**Use "you" for direct address:**
> You can access the editor in two ways.

> You can change the current active tool using `editor.setCurrentTool`.

> You should make sure that there's only ever one `TLSocketRoom` globally.

**Use "we" for the tldraw team or collective decisions:**
> We make a distinction between three types of shapes.

> We've found it best to create the store, set its data, and then pass the store into the editor.

> We use side effects to create a new `TLCamera` record every time a new page is made.

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

### Sentence structure

**Write like a person.** Prefer short, clear sentences, but don't be robotic about it. Natural prose has rhythm—some sentences are short, others flow a bit longer. The goal is readability, not mechanical uniformity.

**Prefer:**
> In tldraw, a shape is something that can exist on the page.

> Shapes are just records (JSON objects) that sit in the store. For example, here's a shape record for a rectangle geo shape.

> When the editor receives an event, it first updates inputs and other state. Then it sends the event to the state chart.

**Avoid complex, nested constructions:**
> When the editor receives an event via its dispatch method, the event is first handled internally to update inputs and other state before being sent into the editor's state chart, where it cascades through the active states.

The problem isn't sentence length—it's cognitive load. Break up ideas when a sentence asks the reader to hold too much in their head at once.

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

## Document structure

### Opening pattern

Start with a clear, direct definition:
> The Editor class is the main way of controlling tldraw's editor.

> In tldraw, a shape is something that can exist on the page, like an arrow, an image, or some text.

> In tldraw, persistence means storing information about the editor's state to a database and then restoring it later.

### Concept → Explanation → Code

Every concept should be followed by a working example:

> You can access the editor in two ways:
>
> 1. From the Tldraw component's `onMount` callback:
>
> ```tsx
> function App() {
>   return (
>     <Tldraw
>       onMount={(editor) => {
>         // your editor code here
>       }}
>     />
>   )
> }
> ```

### Progressive disclosure

Move from simple to complex:
1. Start with the most common use case
2. Add complexity incrementally
3. Leave edge cases and advanced patterns for later sections

**Example from persistence docs:**
1. First: `persistenceKey` prop (simplest)
2. Then: State snapshots (more control)
3. Then: The `store` prop (full control)
4. Finally: Migrations (advanced)

### Short paragraphs

Keep paragraphs to 1-3 sentences. Dense blocks of text are hard to scan:

**Do:**
> Meta information is information that is not used by tldraw but is instead used by your application. For example, you might want to store the name of the user who created a shape, or the date that the shape was created.

**Don't:**
> Meta information is additional data that can be attached to shapes and is not used internally by tldraw but can be leveraged by your application for custom functionality. This could include things like the user who created the shape, timestamps, custom identifiers, or any other application-specific data that you want to associate with shapes but don't want to store in the props object.

### Tables for related information

Use tables to organize related methods, options, or concepts:

| Method | Description |
|--------|-------------|
| `Editor#setCamera` | Moves the camera to the provided coordinates. |
| `Editor#zoomIn` | Zooms the camera in to the nearest zoom step. |
| `Editor#zoomOut` | Zooms the camera out to the nearest zoom step. |

### Notes and callouts

Use blockquotes for important asides:
> If all you're interested in is the state below `root`, there is a convenience method, `Editor#getCurrentToolId`, that can help.

Use stronger callout syntax for warnings:
```
<Callout type="warning">
  You must make sure that the tldraw version in your client matches the version on the server.
</Callout>
```

## Nuggets (tech blog posts)

Nuggets are short technical articles about how we solved interesting problems. They're different from reference documentation—more like posts you'd find on a company engineering blog.

### Different opening pattern

Reference docs start with definitions. Nuggets start by **framing the problem**—a sentence or two that tells the reader what this is about and why it's interesting before diving in.

**Reference doc opening:**
> The Editor class is the main way of controlling tldraw's editor.

**Nugget opening:**
> Every vector editor needs dashed lines, but SVG's native dash support has a flaw: the browser just tiles your pattern until it runs out of path, leaving you with half-dashes and awkward corners.

The nugget opening establishes context (what we're talking about), tension (there's a problem), and stakes (why you should care) before getting into the solution.

### Structure

Nuggets typically follow this arc:

1. **Frame the problem** — What are we solving? Why is it hard or interesting?
2. **Show the insight** — What's the key idea that makes the solution work?
3. **Walk through the implementation** — Code and explanation, building up complexity
4. **Wrap up** — Where this lives in the codebase, tradeoffs, links to files

### Tone differences

Nuggets are warmer than reference docs. They can:

- Use "the trick is..." or "the insight is..." to signal key ideas
- Include brief asides about why something is hard or interesting
- Show the journey, not just the destination ("we tried X, but Y worked better")
- End with opinions ("that's worth the tradeoff")

They still shouldn't:

- Ramble or over-explain
- Use hollow importance claims ("this is crucial for...")
- Get too casual or jokey

### Describe what we did, not what to do

Nuggets explain how tldraw solved a problem—they're not tutorials. Frame solutions as "here's what we do" rather than prescriptive instructions.

**Don't:**
> The solution: don't decide immediately. Watch what the fingers do, then commit once the pattern is clear.

> Instead of guessing, implement a state machine that starts undecided.

**Do:**
> We defer the decision. The gesture handler watches what the fingers do, then commits once the pattern is clear.

> Instead of guessing, we use a state machine that starts undecided.

The reader learns from seeing our approach, not from being told what to do.

### Example openings

**Too abrupt (reads like docs):**
> Tldraw calculates dash patterns that fit paths exactly. Complete dashes at both ends, even spacing throughout.

**Better (starts with our experience):**
> When we added dashed lines to tldraw, we wanted them to look right—complete dashes at both ends, even spacing, corners that line up on rectangles. SVG's `stroke-dasharray` doesn't do this.

**Also good (frames the problem we faced):**
> Arrow routing sounds simple until you try it. Given two shapes, draw a line between them that doesn't pass through anything else. We spent a while getting this right.

## Code examples

### Complete and runnable

Provide full, working examples, not fragments:

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

```ts
// If you are building a multi-user app, you probably want to store
// the document and session states separately because the
// session state is user-specific and normally shouldn't be shared.
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

## Cross-referencing

### Link liberally

Reference related concepts inline rather than explaining everything:
> For more information about how to synchronize the store with other processes, see the [Persistence](/docs/persistence) page.

### API references use consistent format

Link to API docs using the `[MethodName](?)` pattern:
> Use the [Editor#createShapes](?) method.

> See [TLInstancePresence](?) for the full record type.

### Point to working examples

Always link to runnable examples when available:
> For an example of how to create custom shapes, see our [custom shapes example](/examples/shapes/tools/custom-shape).

## Evaluation checklist

When reviewing documentation, check:

- [ ] **Opening sentence** — Does it immediately define what this thing is?
- [ ] **Active voice** — Are most sentences active, not passive?
- [ ] **Code examples** — Is every concept followed by working code?
- [ ] **Confidence** — Are assertions direct, without hedging?
- [ ] **Readability** — Does it read naturally? Is cognitive load managed?
- [ ] **Pronouns** — Is "you" used for the reader and "we" for tldraw?
- [ ] **Sentence case** — Are headings in sentence case?
- [ ] **Progressive disclosure** — Does complexity build gradually?
- [ ] **Honesty** — Are limitations stated directly?
- [ ] **Links** — Are related concepts cross-referenced?
- [ ] **Human voice** — No hollow importance claims, trailing gerunds, or formulaic transitions?

## Summary

Write like a knowledgeable colleague who:
- Gets to the point quickly
- Shows working code immediately
- Respects the reader's intelligence
- Is honest about limitations
- Has occasional warmth without being chatty

The goal is documentation that developers trust, can scan quickly, and can copy-paste to get something working.
