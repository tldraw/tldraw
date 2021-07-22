# Testing Guide

Writing tests for tldraw? This guide will get you started.

- [Getting Started](#getting-started)
- [How to Test](#how-to-test)
- [What to Test](#what-to-test)
- [TestUtils](#test-utils)

## Getting Started

This project uses Jest for its unit tests.

- To run the test suite, run `yarn test` in your terminal.
- To start the test watcher, run `yarn test:watch`.
- To update the test snapshots, run `yarn test:update`.

Tests live inside of the `__tests__` folder.

To create a new test, create a file named `myTest.test.ts` inside of the `__tests__` folder.

## How to Test

In tldraw, we write our tests against application's _state_.

Remember that in tldraw, user interactions send _events_ to the app's _state_, where they produce a change (or not) depending on the state's configuration and current status. To test a feature, we "manually" send those same events to the state machine and then check whether the events produced the change we expected.

To test a feature, we'll need to:

- learn how the features works in tldraw
- identify the events involved
- identify the outcome of the events
- reproduce the events in our test
- test the outcome

### Example

Let's say we want to test the "create a page" feature of the app.

We'd start by creating a new file named `create-page.test.ts`. Here's some boilerplace to get us started.

```ts
// __tests__/create-page.test.ts

import TestState from '../test-utils'
const tt = new TestState()

it('creates a new page', () => {})
```

In the code above, we import our `TestState` class, create a new instance for this test file, then have a unit test that will assert something about our app's behavior.

In the app's UI, we can find a button labelled "create page".

```tsx
// page-panel.tsx

<DropdownMenuButton onSelect={() => state.send('CREATED_PAGE')} />
```

Because we're only testing the state machine, we don't have to worry about how the `DropdownMenuButton` component works, or whether `onSelect` is implemented correctly. Instead, our only concern is the call to `state.send`, where we "send" the `CREATED_PAGE` event to the app's central state machine.

Back in our test, we can send that the `CREATED_PAGE` event ourselves and check whether it's produced the correct outcome.

```ts
// __tests__/create-page.test.ts

import TestState from '../test-utils'
const tt = new TestState()

it('creates a new page', () => {
  const pageCountBefore = Object.keys(tt.state.data.document.pages).length

  tt.state.send('CREATED_PAGE')

  const pageCountAfter = Object.keys(tt.state.data.document.pages).length

  expect(pageCountAfter).toEqual(pageCountBefore + 1)
})
```

If we run our tests (with `yarn test`) or if we're already in watch mode (`yarn test:watch`) then our tests should update. If it worked, hooray! Now try to make it fail and see what that looks like, too.

## What to Test

While a test like "create a page" is pretty self-explanatory, most features are at least a little complex.

To _fully_ test a feature, we would need to:

- test the entire outcome
- testing every circumstance under which the outcome could be different

Let's take another look at the `CREATED_PAGE` event.

If we search for the event in the state machine itself, we can find where and how event is being handled.

```ts
// state/state.ts

ready: {
  on: {
    // ...
    CREATED_PAGE: {
      unless: ['isReadOnly', 'isInSession'],
      do: 'createPage',
    }
  }
}
```

Here's where we can see what exactly we need to test. The event can tell us a few things:

- It should only run when the "ready" state is active
- It never run when the app is in read only mode
- It should never run when the app is in a session (like drawing or rotating)

These are all things that we could test. For example:

```ts
// __tests__/create-page.test.ts

import TestState from '../test-utils'
const tt = new TestState()

it('does not create a new page in read only mode', () => {
  tt.state.send('TOGGLED_READ_ONLY')

  expect(tt.state.data.isReadOnly).toBe(true)

  const pageCountBefore = Object.keys(tt.state.data.document.pages).length

  tt.state.send('CREATED_PAGE')

  const pageCountAfter = Object.keys(tt.state.data.document.pages).length

  expect(pageCountAfter).toEqual(pageCountBefore)
})
```

> Note that we're using a different event, `TOGGLED_READ_ONLY`, in order to get the state into the correct condition to make our test. When using events like this, it's a good idea to assert that the state is how you expect it to be before you make your "real" test. Here that means testing that the state's `data.isReadOnly` boolean is `true` before we test the `CREATED_PAGE` event.

We can also look at the `createPage` action.

```ts
// state/state.ts

createPage(data) {
  commands.createPage(data, true)
},
```

If we follow this call, we'll find the `createPage` command (`state/commands/create-page.ts`). This command is more complex, but it gives us more to test:

- did we correctly iterate the numbers in the new page's name?
- did we get the correct child index for the new page?
- did we save the current page to local storage?
- did we save the new page to local storage?
- did we add the new page to the document?
- did we add the new page state to the document?
- did we go to the new page?
- when we undo the command, will we remove the new page / page state?
- when we redo the command, will we put the new page / page state back?

To _fully_ test a feature, we'll need to write tests that cover all of these.

### Todo Tests

...but while full test coverage is a goal, it's not always within reach. If you're not able to test everything about a feature, it's a good idea to write "placeholders" for the tests that need to be written.

```ts
describe('when creating a new page...', () => {
  it('sets the correct child index for the new page', () => {
    // TODO
  })

  it('sets the correct name for the new page', () => {
    // TODO
  })

  it('saves the document to local storage', () => {
    // TODO
  })
})
```

### Snapshots

An even better way to improve coverage when dealing with complex tests is to write "snapshot" tests.

```ts
describe('when creating a new page...', () => {
  it('updates the document', () => {
    tt.state.send('CREATED_PAGE')
    expect(tt.state.data).toMatchSnapshot()
  })
})
```

While snapshot tests don't assert specific things about a feature's implementation, they will at least help flag changes in other parts of the app that might break the feature. For example, if we accidentally made the app start in read only mode, then the snapshot outcome of `CREATED_PAGE` would be different—and the test would fail.

## TestUtils

While you can test every feature in tldraw by sending events to the state, the `TestUtils` class is designed to make certain things easier. By convention, I'll refer to an instance of the `TestUtils` class as `tt`.

```ts
import TestState from '../test-utils'
const tt = new TestState()
```

The `TestUtils` instance wraps an instance of the app's state machine (`tt.state`). It also exposes the state's data as `tt.data`, as well as the state's helper methods (`tt.send`, `tt.isIn`, etc.)

- `tt.resetDocumentState` will clear the document and reset the app state.
- `tt.createShape` will create a new shape on the page.
- `tt.clickShape` will click a the indicated shape

Check the `test-utils.ts` file for the rest of the API. Feel free to add your own methods if you have a reason for doing so.
