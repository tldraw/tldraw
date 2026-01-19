# Steve Ruiz's writing style

These examples demonstrate the target voice for nuggets. Study the sentence rhythms, paragraph shapes, and how explanations flow around code.

---

## Example 1: Tutorial-style (Reordering items in an array)

> In an app that uses a zoom UI, canvas, or really any paradigm where things are "stacked" in order from back to front, the user interface will usually provide some commands that let a user move items in the stack:
>
> - Send to Back
> - Send Backward
> - Bring Forward
> - Bring to Front
>
> Implementing these commands will depend on how your application structures its items. Are they in an array? Are they in a table? Is this a multiplayer application?
>
> In this article, I'll cover the most straightforward implementation in an app that structures its items in an array. In a future post, I'll cover a more complex method in an application where items are stored in a hash table.
>
> ### Mise en place
>
> Let's say we have an application where we're storing our items in an array:
>
> ```ts
> type Item = { id: string }
> type Items = Item[]
> const itemsExample: Items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
> ```
>
> In this structure, each item's "order" is represented by that item's index in the array. In the example above, the item `{ id: "a" }` has the index of 0, the item `{ id: "b" }` has the index of 1, etc.
>
> Now that we have our data worked out, let's look at how we would implement our four reordering commands.
>
> ### Send to Back
>
> ```ts
> function sendToBack(items: Item[], ids: string[]) {
> 	const movingIds = new Set(ids)
> 	const moving: Item[] = []
> 	const notMoving: Item[] = []
> 	for (const item of items) {
> 		const arr = movingIds.has(item.id) ? moving : notMoving
> 		arr.push(item)
> 	}
> 	return moving.concat(notMoving)
> }
> ```
>
> For `sendToBack`, we would want the new items array to be all of the moving items, sorted by their prior order within the items array, followed by all of the static items sorted by their prior order in the items array.
>
> This works for single items as well as for multiple items.
>
> ### Send Backward
>
> Sending an item backward is a little more complex. Here we want to iterate through each moving item's original index and try to swap the item we find at that index in the results array with its neighbor at the index below. If there is no neighbor item, then this means we're trying to move the first item in the list; and if the neighbor is also moving, then this means we haven't yet been able to move any items down.
>
> ### Wrapup
>
> Moving items in an array has some upsides and some downsides. An advantage is that items may be placed in the document or painted in the correct order without any further sorting or manipulation.
>
> The main disadvantage comes from the difficulty of accessing a particular item within the array, which requires a search through the array.
>
> This adds some new trickiness and I'll cover that in the next post.

---

## Example 2: Problem-solution style (Next.js hot refresh)

> ### The problem
>
> Vercel provides excellent documentation of using Markdown / MDX together with Next.js (including with its new App Router). While it's possible to have .mdx files map 1-1 to pages using the file-based routing system, this is impractical for most projects and especially for projects with many dozens or hundreds of content files. For these projects, the answer has been to use remote MDX via the Hashicorp library next-mdx-remote, where content files are created server-side upon first request.
>
> This is a great solution, but it has one drawback: the Next.js App Router does not refresh when content in the folder changes. This is a problem for content creators who want to see their changes reflected in the browser without having to restart the server or manually refresh the page.
>
> The solution used to be using a library named next-remote-watch. However, this library only seems to work with the pages directory and does not work with the new Next.js app router.
>
> Luckily, Dan Abramov found a great solution. The solution shared above is a slight adaptation that I used on the tldraw docs site.
>
> ### How it works
>
> When you run `npm run dev`, you'll start a regular Next.js dev server and a websocket server. That server will use `fs.watch` to observe changes in a folder where your content is stored.
>
> Meanwhile, when the root layout mounts, a hook in the AutoRefresh component will connect to the websocket server. Once it's connected, it will set a listener that calls `router.refresh()` when it receives a refresh message from the websocket server.
>
> When the server detects a change anywhere in the content directory, the websocket server will send a refresh message to its connected clients. This will trigger the listener in the AutoRefresh component and cause the Next.js App Router to refresh and display the freshly edited content.
>
> ### Tweaks and modifications
>
> You can do whatever you want inside of `watcher.ts` before dispatching the refresh event.
>
> In our case, we respond to a change in the content directory by parsing every file in the content directory and stuffing it into a sqlite database with navigation links and so on—and only when that's done (maybe 12ms later) do we send off the refresh event. However, because this is an asynchronous process, and because dev-mode react runs every hook, our watch callback wrapped in a debounce function to avoid trying to do the work twice in a row.
>
> You can also dispatch the refresh event whenever you want, such as on an interval or in response to some other listener if you're pulling data from a different source. The general idea is still using websockets to trigger a refresh of the Next.js App Router.
>
> And of course you don't have to use these exact libraries or methods. For example, you can skip tsx as a dependency and use plain JavaScript for your watcher script. If you've got a websocket server running and a listener in your root layout, you're good to go.

---

## Style patterns

### Sentence-level

- **Varied length**: Short punchy sentences ("This works for single items as well as for multiple items.") mixed with longer explanatory ones
- **Active voice**: "we want to iterate", "the server will send", not "iteration is performed"
- **Contractions**: it's, you'll, don't, we've — sounds like speech
- **No hedging**: Avoids "quite", "somewhat", "fairly", "arguably"
- **Semicolons for flow**: Connects related clauses without breaking into separate sentences
- **Parenthetical asides**: "(maybe 12ms later)" — adds precision without formality

### Paragraph-level

- **One idea per paragraph**: Each paragraph has a single job
- **Short paragraphs for transitions**: Sometimes just one sentence
- **Code breaks up prose**: Explanations wrap around code naturally
- **Lists when parallel**: Uses bullets for genuinely parallel items, not to pad content

### Opening patterns

- Broad context first, then narrows: "In an app that uses a zoom UI, canvas, or really any paradigm..."
- Rhetorical questions that mirror the reader: "Are they in an array? Are they in a table?"
- Acknowledges what exists before introducing something new

### Explaining code

- Code first, then explanation (not the reverse)
- "Let's say we have..." to set up examples
- Walks through what the code does in plain language
- "is a little more complex" — acknowledges difficulty without drama

### Transitions

- "Meanwhile," "However," "Luckily," — simple connectors, not "Furthermore" or "Moreover"
- "This works for X as well as for Y" — clean parallel structure
- "And of course you don't have to..." — permissive, not prescriptive
- Try not to use phrases like "The catch?" or "The actual work is done by"

### Closing patterns

- Honest about tradeoffs: "has some upsides and some downsides"
- Credits others: "Luckily, Dan Abramov found a great solution"
- Casual sign-offs: "you're good to go", "I'll cover that in the next post"
- No summary that repeats what was just said
