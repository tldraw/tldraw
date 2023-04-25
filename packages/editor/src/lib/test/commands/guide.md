# Guide

Every method on `App` should have its own unit tests.

A few situations that cause tests to fail:

- The shape is rotated
- The shape is a child of another shape
- The shape is the child of a rotated shape
- The shape is not in the viewport
- The shape has an arrow bound to it
- Undo / redo
