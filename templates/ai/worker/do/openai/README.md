# How this works

The `OpenAiService` in this example is responsible for generating changes based on data from the client. The service implements two methods: `generate` and `stream`. Both will receive the same information from the client, then use this information to prompt the LLM, and finally return (or stream) changes in the format expected by the tldraw ai module (`TLAiResult`).

## Data from the client

The client will send a prompt that contains information from the canvas, including the user's messages, the user's current context bounds (what we want the AI to think the user's looking at), all of the canvas content that appears inside of the context bounds, and the prompt bounds (where we want the AI to create their changes).

## Simple schema

The data sent by the client is complex. It contains lots of information about the shapes on the canvas, as well as information about bindings and other things. Likewise, the changes that we return to the client are complex and should include the same type of information.

While it is possible to prompt an LLM with the "raw" received data and ask for our target output format as a response, we have found it much more effective to use a "simplified" schema as part of the prompts we send to the LLM and the responses we expect in return.

You'll find the schema for this example's simplified format in `schema.ts`.

## Building the prompt

Once we've received data from the client, our first step is to assemble our prompt (see `prompt.ts`). We add our system prompt as well as several "developer" messages that share information about the user's context and the current state of the canvas using our simplified format.

## Handling the response

The model's response should adhere to our schema. It will contain an array of "events", such as "create" or "move". Once we have an event in the LLM's simplified format (`ISimpleEvent`), we can create our final changes in the target format (`TldrawAiChange`). A single event may lead us to create multiple changes, such as when an arrow is created that connects one or more shapes.

Once we have our changes, we send them back to the client.

## Conclusion

That's the whole story:

- the client sends us information expecting "changes" in return
- we create a prompt that uses a simplified format for the canvas content
- we prompt the model to generate a response using our simplified format
- we turn the response's "events" into "changes"
- we send (or stream) the changes back to the client

# Extending the system

If you're hacking on this example, you might want to add more events or handle new shapes.

## Adding a new shape type

If you wanted to handle a new type of shape, you would need to:

- Create a simple version of the shape in `schema.ts`
- Add a switch case to `getSimpleContentFromCanvasContent` that creates a simple version of the shape based on a regular tldraw shape
- Add a switch case to `getTldrawAiChangesFromSimpleEvent`'s create handler that will create the correct changes when the LLM returns a `create` event for this shape type

## Adding a new event

If you wanted to handle a new type of event (like "duplicate shape"), you would need to:

- Create the simple event in `schema.ts`
- Add a switch case to `getTldrawAiChangesFromSimpleEvents` to handle the event

## Prompt engineering

You can of course hack the system prompt (`system-prompt.ts`) in order to be more reliable or produce better outputs.

Good luck! Join the [Discord channel](https://discord.gg/9PSF2C5KgV)!
