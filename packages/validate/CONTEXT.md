# CONTEXT.md - @tldraw/validate

A runtime validation library providing type-safe data validation with detailed error reporting and performance optimization through incremental validation.

## Package Overview

- **Purpose**: Runtime validation of data structures with TypeScript type inference and performance optimizations
- **Type**: Validation Library
- **Status**: Production
- **Dependencies**: `@tldraw/utils` (internal)
- **Consumers**: Schema validation (tlschema), worker applications, dotcom, editor, and other data-intensive applications

## Architecture

### Core Components

- **Validator**: Core validation class with type inference and error handling
- **ObjectValidator**: Validates object structures with property-level validation
- **ArrayOfValidator**: Validates arrays of elements with consistent typing
- **DictValidator**: Validates key-value dictionaries with type constraints
- **UnionValidator**: Validates union types with discriminated matching
- **Primitive Validators**: Built-in validators for strings, numbers, booleans, etc.

### Key Files

- `src/index.ts` - Main exports and library registration
- `src/lib/validation.ts` - Complete validation system implementation
- `src/test/validation.test.ts` - Comprehensive validation tests
- `src/test/validation.fuzz.test.ts` - Fuzz testing for edge cases

## API/Interface

### Public API

```ts
import { T } from '@tldraw/validate'

// Basic validators
const stringValidator = T.string
const numberValidator = T.number
const booleanValidator = T.boolean

// Object validation
const userValidator = T.object({
  id: T.string,
  name: T.string,
  age: T.number,
  email: T.optional(T.string)
})

// Array validation
const usersValidator = T.arrayOf(userValidator)

// Union validation
const statusValidator = T.union('status', {
  success: T.object({ data: T.string }),
  error: T.object({ error: T.string })
})

// Usage
const user = userValidator.validate(unknownData) // Type-safe result
const users = usersValidator.validate(unknownArray) // User[]

// Performance optimization with known good values
const updatedUser = userValidator.validateUsingKnownGoodVersion(
  previousUser,
  newUserData
) // Incremental validation
```

Main validator types:
- **T.string, T.number, T.boolean** - Primitive validators
- **T.object(schema)** - Object structure validation
- **T.arrayOf(validator)** - Array element validation
- **T.union(discriminant, variants)** - Discriminated union validation
- **T.optional(validator)** - Optional property validation

### Performance Optimizations

- **Incremental Validation**: `validateUsingKnownGoodVersion()` avoids re-validating unchanged parts
- **Reference Equality**: Returns previous value if validation passes but data is referentially different
- **Error Caching**: Efficient error path handling with detailed error messages

## Development

### Setup

```bash
cd packages/validate
yarn install
```

### Commands

- `yarn test` - Run comprehensive test suite including fuzz tests
- `yarn build` - Build package with TypeScript compilation
- `yarn lint` - Lint code for consistency

### Testing

- Unit tests for all validator types and edge cases
- Fuzz testing with random data generation
- Performance tests for incremental validation
- Error message validation and formatting tests
- Run tests: `yarn test`

## Integration Points

### Depends On

- `@tldraw/utils` - Utility functions for object manipulation, type checking, and error handling

### Used By

- `@tldraw/tlschema` - Validates all shape, record, and asset data
- `@tldraw/editor` - Runtime validation of editor state and user input
- `apps/dotcom-worker` - Validates multiplayer sync data
- `apps/bemo-worker` - Validates merge operations and data integrity
- `apps/dotcom` - Client-side data validation
- `apps/huppy` - Validates GitHub webhook data
- `apps/images.tldraw.xyz` - Validates image processing requests

## Common Issues & Solutions

### Performance with Large Objects
- **Issue**: Slow validation of large, nested data structures
- **Solution**: Use `validateUsingKnownGoodVersion()` for incremental validation when possible

### Unclear Error Messages
- **Issue**: Validation errors don't clearly indicate the problem location
- **Solution**: Validation includes detailed path information (e.g., "user.profile.email")

### Union Type Discrimination
- **Issue**: Union validators not properly distinguishing between variants
- **Solution**: Use discriminated unions with a common property (like `type` or `kind`)

### Memory Usage with Cached Validators
- **Issue**: Validators holding references to validated objects
- **Solution**: Validators are stateless - validated objects can be garbage collected normally

## Future Considerations

- Enhanced TypeScript 5.0+ integration for better type inference
- JSON Schema compatibility for external integration
- Streaming validation for large datasets
- Custom error message formatting
- Validation middleware/plugin system
- Performance profiling and optimization tools
- Schema evolution and migration support