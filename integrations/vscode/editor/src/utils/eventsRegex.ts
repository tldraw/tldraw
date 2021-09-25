// A regex to detect event types that we should send to the extension. We only want to send
// events that change the document and that would be committed to the undo/redo stack; not
// all the smaller patches or transient changes from sessions.
export const eventsRegex = /command|undo|redo/
