# @tldraw/indices

Welcome to **indices** by [tldraw](https://tldraw.dev). This library provides functions for features that rely on fractional indexing. It is based on the observable [Implementing Fractional Indexing](https://observablehq.com/@dgreensp/implementing-fractional-indexing) by [@DavidG](https://twitter.com/DavidG).

Fractional indexing is a method for creating indices between other indices without running into precision errors. This is useful when items are modeled as object maps rather than as arrays.

For example, imagine a stack of 5 cards:

```ts
const cards = {
	A: 0,
	B: 1,
	C: 2,
	D: 3,
	E: 4,
}
```

In a naive implementation of indexing, moving card E to the "bottom" of the stack would mean changing every item in the map.

```ts
const cards = {
	A: 1,
	B: 2,
	C: 3,
	D: 4,
	E: 0, // <-- moved to back
}
```

each with an index between `0` and `51`. In a naive implementation of indices, moving the top card (index `51`) to the bottom of the deck would mean changing its index to `0`, changing the previous bottom card's index to `1`, and so forth incrementing every other card's index by one.

## Installation

```bash
npm i @tldraw/indices
# or
yarn add @tldraw/indices
```

## Usage

### getIndexBetween

Get an index between two other indices.

### getIndexAbove

Get an index above a given index.

### getIndexBelow

Get an index below a given index.

### getIndicesBetween

Get a number of indices between two indices.

### getIndicesAbove

Get a number of indices above a given index.

### getIndicesBelow

Get a number of indices below a given index.

### getIndices

Get an array of indices with a given length.

### `sortByIndex`

Sort an array of objects by their `index` property.

## License

The source code in this repository (as well as our 2.0+ distributions and releases) are currently licensed under Apache-2.0. These licenses are subject to change in our upcoming 2.0 release. If you are planning to use tldraw in a commercial product, please reach out at [hello@tldraw.com](mailto://hello@tldraw.com).
