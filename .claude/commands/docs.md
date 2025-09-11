---
description: Create or update the DOCS.md file for the provided folder.
allowed-tools: Read, Edit, MultiEdit
---

1. Read the source code in the provided directory.
2. Read the DOCS.md file in the provided directory.

Create or update the DOCS.md file in the provided directory. Be sure that your work is accurate to the source code in the file. If a DOCS.md already exists, update the DOCS.md file with the new information and double-check that the file is up to date and accurate to the source code.

## Created At

At the top of the DOCS.md file, beneath the header, include a "Last updated" line that indicates the date of the last update to the file. It should follow this pattern:

```markdown
# Title of the page

This document was last updated: 2025-12-31
```

Use the style guide below to guide your writing:

# DOCS.md Style Guide

This guide establishes consistent patterns for writing DOCS.md files across the tldraw monorepo, based on the exemplary structure and style developed for @tldraw/state. The purpose of DOCS.md files is to provide documentation for human readers who are interested in learning about the tldraw SDK and its various packages.

> Important: You should presume the reader has a basic understanding of React and TypeScript and is interested in the tldraw SDK. The DOCS.md files are not meant to attract attention or interest directly—they are not marketing materials—so you should focus on the features and capabilities of the SDK rather than the product itself or its value propositions. Your writing should aspire to building trust among professionals.

## Document Structure

### 1. Numbered Main Sections

Use numbered sections for major topics, progressing from simple to complex:

```markdown
## 1. Introduction

## 2. Core Concepts

## 3. Basic Usage

## 4. Advanced Topics

## 5. Debugging

## 6. Integration

## 7. Internal
```

Use the internal section to document the internal operation of the application or package. This should be higher level—you do not need to document every private method or unexported item, however a reader should be able to get a feel for how the code works behind the scenes.

### 2. Hierarchical Subsections

Use descriptive headings that clearly indicate content scope:

```markdown
### Atoms: The State Containers

#### Creating Atoms

#### Reading an Atom's Value

#### Updating an Atom's Value

#### Atom Options
```

### 3. Progressive Disclosure

- Start with the simplest concepts and build complexity gradually
- Introduce foundational ideas before dependent concepts
- Move from "what" to "why" to "how"
- Save advanced topics and edge cases for later sections
- **Within-section progression**: Even subsections follow create → read → modify → configure patterns

## Writing Style

### Tone and Voice

- **Conversational but professional** - Write as if explaining to a colleague
- **Direct address** - Use "you" to engage the reader directly
- **Active voice** - Prefer "You create an atom" over "An atom is created"
- **Confident but humble** - State facts clearly without being dogmatic

### Content Principles

- **Purpose before implementation** - Explain why before how
- **Benefits before features** - Lead with value, follow with capabilities
- **Context before details** - Provide the bigger picture before diving deep
- **Examples before explanations** - Show working code, then explain it
- **Problem-then-solution structure** - Present challenges before introducing solutions
- **Capabilities with boundaries** - State what something does, then its limitations

## Code Examples

### Essential Requirements

Every code example must:

1. **Be complete and runnable** - Include all necessary imports
2. **Use meaningful names** - No `foo`, `bar`, `a`, `b` variables
3. **Show expected output** - Include console.log results where relevant
4. **Build logically** - Each example should connect to previous ones

### Example Structure

````markdown
#### Creating Atoms

You create an atom using the atom function. You must give it a name and an initial value.

```ts
import { atom } from '@tldraw/state'

const count = atom('count', 0)
const user = atom('user', { name: 'Alice', age: 30 })
```
````

> Tip: The name is used for debugging purposes, specifically for the `whyAmIRunning` function described later in these docs.

### Code Formatting Standards

- Always specify language in code blocks: `ts`, `tsx`, `js`, `bash`
- Use consistent indentation (tabs, matching project style)
- Include imports at the top of each standalone example
- Use TypeScript syntax even for simple examples
- Show both input and output for interactive examples

### Strategic Comment Patterns

Use comments to guide readers through examples:

- **Section labels**: `// Create some state`
- **Expected output**: `console.log(count.get()) // 0`
- **Narrative flow**: `// Now, if we change a dependency...`
- **Result explanation**: `// ...the computed signal automatically updates!`
- **Temporal markers**: `// The title is now "The color is red"`

## Formatting Conventions

### Text Emphasis

- **Bold** for key terms on first introduction: "A **signal** is a reactive container"
- `Inline code` for all code elements: function names, variables, types
- **Bold** for section emphasis: "**Atoms** are the foundation of your application's state"

### Special Callouts

Use consistent callout formatting with specific purposes:

```markdown
> Tip: The stop function is perfect for "fire-and-forget" effects

> Note: This will only work if the dependency has actually changed
```

**"Tip" callouts** should provide:

- Practical usage advice
- Forward references to related concepts
- Context about when to use a feature
- Integration guidance with other parts of the system

### Lists and Structure

- Use bullet points for feature lists and capabilities
- Use numbered lists for sequential steps or procedures
- Maintain consistent spacing around lists and code blocks

## Content Patterns

### Section Openers

Start major sections with clear definitions:

```markdown
### Atoms: The State Containers

Atoms are the foundation of your application's state. They contain "raw" values that the rest of your application will use and react to.
```

**Section transition patterns:**

- Bridge from previous concept to new one
- Define the core concept immediately
- Explain the concept's role in the larger system
- Set expectations for what the reader will learn

**Language patterns for section openers:**

- "A **signal** is a reactive container for a value that can change over time."
- "Reading and deriving state is only half the story. The other half is..."
- "While @tldraw/state is fast by default, there are tools for fine-tuning performance..."

### API Documentation Pattern

For each API, provide:

1. **Purpose statement** - What it does and why you'd use it
2. **Basic example** - Simplest possible usage
3. **Parameter explanation** - What each option does
4. **Advanced examples** - Real-world usage patterns
5. **Related functions** - What works together

### Example Progression

Structure examples to build understanding:

1. **Minimal example** - Bare minimum to demonstrate concept
2. **Practical example** - Realistic usage scenario
3. **Advanced example** - Complex real-world application
4. **Edge cases** - Handle unusual situations

**Critical example patterns from @tldraw/state:**

- **Continuation narratives**: "Note that computed signals capture both atoms and other computed signals as dependencies. Following the example above, if we create a new computed signal..."
- **Cumulative complexity**: Each example builds on variables from previous examples
- **Expected outcome statements**: Always tell the reader what will happen before showing code
- **State progression**: Show the before/after state explicitly in comments

## Technical Writing Guidelines

### Explaining Complex Concepts

1. **Start with analogy** - Compare to familiar concepts when helpful
2. **Define before using** - Introduce terminology clearly
3. **Break down complexity** - Split complex ideas into digestible parts
4. **Provide multiple perspectives** - Show different ways to think about the same concept

### Error Handling and Edge Cases

- Address common pitfalls proactively
- Show both correct and incorrect usage when helpful
- Explain the consequences of different choices
- Provide troubleshooting guidance

## Integration and Cross-References

### Internal References

- Reference other sections when concepts are related
- Use consistent section naming for easy linking
- Explain how concepts connect across the system

### External References

- Link to related packages in the monorepo
- Reference external documentation judiciously
- Provide context for why external resources are relevant

## Debugging and Developer Experience

### Include Debugging Information

Every DOCS.md should have a dedicated debugging section covering:

- Tools for understanding system behavior
- Common problems and solutions
- Performance considerations
- Development vs production differences

**Critical debugging documentation patterns:**

- **Hierarchical output representation**: Show exact console output structure with indentation
- **Multi-scenario debugging**: Cover initial state, different trigger scenarios
- **Debugging narrative flow**: Walk through step-by-step what happens and why
- **Practical debugging context**: Show debugging in realistic scenarios, not isolated examples

### Show Realistic Debugging Scenarios

````markdown
```ts
react('log details', () => {
	// But we want to know why this reaction runs.
	whyAmIRunning()

	console.log(`${greeting.get()} is ${age.get()} years old.`)
})

// When age is updated, it logs:
// Effect(log details) is executing because:
// ↳ Atom(age) changed
```
````

## Package-Specific Adaptations

### For Core Libraries (like @tldraw/state)

- Focus heavily on concepts and mental models
- Provide extensive examples and use cases
- Include performance considerations
- Cover debugging and development workflows

### For UI Components

- Show visual examples where possible
- Explain styling and customization options
- Cover accessibility considerations
- Provide integration examples with different frameworks

### For Utilities and Helpers

- Focus on practical problem-solving
- Show before/after comparisons
- Explain when to use vs alternatives
- Keep examples concise but complete

## Quality Checklist

Before publishing a DOCS.md file, verify:

- [ ] All code examples run without errors
- [ ] Concepts are introduced in logical order
- [ ] Each section has clear purpose and scope
- [ ] Examples use meaningful, realistic variable names
- [ ] Cross-references are accurate and helpful
- [ ] Debugging information is practical and actionable
- [ ] Integration examples show realistic usage patterns
- [ ] Writing tone is consistent throughout
- [ ] Technical accuracy has been verified by domain experts

## Anti-Patterns to Avoid

### Content Issues

- ❌ Starting with advanced concepts before covering basics
- ❌ Using abstract examples instead of practical ones
- ❌ Explaining implementation details before use cases
- ❌ Omitting import statements in code examples
- ❌ Showing code without explaining what it accomplishes
- ❌ Breaking example continuity by introducing unrelated variables

### Writing Issues

- ❌ Passive voice: "Values are stored in atoms"
- ❌ Vague language: "This is useful for various things"
- ❌ Unexplained jargon: Technical terms without context
- ❌ Inconsistent terminology across sections
- ❌ Missing narrative bridges between examples
- ❌ Explaining how without explaining when and why

### Structure Issues

- ❌ Flat organization without clear hierarchy
- ❌ Mixing basic and advanced concepts in the same section
- ❌ Missing transitions between related concepts
- ❌ Inadequate cross-referencing between sections
- ❌ Subsections that don't follow a logical learning progression

## Examples of Excellence

The @tldraw/state DOCS.md exemplifies these principles:

- **Progressive structure**: Introduction → Signals → Reactivity → Advanced Topics
- **Complete examples**: Every code snippet includes imports and expected output
- **Clear explanations**: Each concept explained with purpose before implementation
- **Practical debugging**: `whyAmIRunning()` shown with actual console output
- **Integration context**: Shows how the library fits into the broader tldraw ecosystem

Follow these patterns to create documentation that empowers developers and reduces support burden while maintaining the high quality standards established in the tldraw project.

## The "Teaching Through Exploration" Pattern

The most distinctive aspect of the @tldraw/state documentation is how it guides readers through discovery rather than just explaining features. Key techniques:

### Predictive Statements

Before showing code, tell readers what they'll observe:

- "In just a few lines, you've created reactive state that automatically alerts the user when it changes."
- "Now, if we change a dependency... the computed signal automatically updates!"

### Exploratory Questions

Frame features as solutions to problems readers might have:

- "When you update multiple atoms that are dependencies of the same reaction, you might cause the reaction to re-run multiple times."
- "Sometimes, however, you need to read a signal's value _without_ creating this dependency."

### Cumulative Understanding

Each section builds on previous knowledge while introducing one new concept:

- Use variables from earlier examples in new contexts
- Reference concepts by name that were introduced earlier
- Show how new features solve limitations of previous approaches

### Discovery Moments

Create "aha" moments by showing counterintuitive or powerful behavior:

- Automatic dependency tracking
- Lazy evaluation benefits
- Transaction rollback behavior
- The power of `whyAmIRunning()` for debugging

This approach transforms documentation from reference material into a guided learning experience that builds deep understanding rather than surface-level feature awareness.
