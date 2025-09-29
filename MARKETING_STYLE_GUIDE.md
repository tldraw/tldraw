# Marketing Style Guidelines for tldraw SDK

The overall goal is confident, clear technical marketing that shows both immediate value and extensibility potential, grounded in real capabilities.

## Target Audience & Product Focus

### Primary Audience: Technical Decision Makers

- **Senior Frontend/Fullstack Developers** evaluating tools for canvas applications
- **Technical Leads** assessing SDK capabilities and extensibility
- **Product Managers** understanding what's possible to build

### Product Positioning

- Marketing the SDK, not the dotcom - Focus on what developers get to build with, not end-user design tool features
- TypeScript/React SDK for building canvas applications, providing "undifferentiated heavy-lifting"
- Technical product with friendly but professional tone - Accessible to developers but not overly technical
- Assume readers have React/TypeScript knowledge but may be new to canvas applications

## Language & Word Choice

### Voice and Tone

- **Confident but not arrogant** - Know your stuff, don't oversell
- **Helpful but not condescending** - Respect developer expertise
- **Direct and practical** - Focus on what developers can accomplish
- **Professional but approachable** - Like a knowledgeable colleague, not a salesperson

### Words to Avoid/Use Sparingly

- Avoid overused words: "seamless," "sophisticated"
- Use sparingly (max once per article): "harness", "accelerate", "unleash", "enables," "allows," "ensures", "enhances", "robust", "powerful"
- Instead of "enables" → use "supports," "provides," "includes"
- Instead of "allows" → use "lets you," "supports," "handles"
- Instead of "robust" → use "reliable," "comprehensive," "well-tested"
- Instead of "powerful" → use "flexible," "capable," "full-featured"

### Technical Jargon Guidelines

- **Define on first use** for canvas/graphics terms (viewport, geometry, binding, etc.)
- **Assume familiarity** with React/TypeScript concepts (hooks, props, components)
- **Briefly explain** tldraw-specific concepts: "binding system (automatic relationship management)"
- **Use parenthetical definitions**: "shape utilities (the classes that define shape behavior)"

### Writing Mechanics

- Avoid complex clauses, especially "while" clauses
- Prefer active, direct language over passive constructions
- Always keep tldraw lowercase (avoid at sentence beginnings)
- Avoid patterned writing like "This ensures" or "This enables" - use specific subjects
- No noun strings: "Enterprise-grade collaboration integration patterns" → break into readable phrases
- Use second person ("you") to directly address developers
- Prefer present tense over future tense
- Write for global developer audience - avoid idioms and cultural references
- Be consistent with technical terminology throughout an article

## Sentence Structure & Flow

- Avoid long sentences but don't make everything choppy
- Vary sentence length (~20% more variation) for engagement and readability
- Prefer shorter sentences over long ones but maintain natural flow
- Inspired by Apple's classic technical writing (like HyperCard manual) - clear, confident, accessible to mixed technical audiences

## Content Strategy & Value Props

### Dual Value Proposition Framework

1. **Out-of-the-box excellence**: "Look at this precision-engineered UX your users get immediately"
2. **Extensibility foundation**: "Built on the same APIs you can use to create custom solutions"

### Content Categorization

- **"Out of the box whiteboard"**: Ready-to-use features that work immediately (embeds, arrows, tools)
- **"Composable primitives"**: Foundational systems developers can extend (geometry, snapping, bindings)

### Developer-Focused Benefits

- Lead with **what developers can build**, not just what the SDK does
- Address **common canvas application challenges** (performance, collaboration, precision)
- Show **time-to-value**: "Get X working in minutes, customize Y when needed"
- Use **concrete examples**: "Build a flowchart editor," "Create a design tool," "Add annotations"

### Competitive Positioning (Subtle)

- Focus on **unique capabilities** rather than direct comparisons
- Emphasize **depth of implementation** without claiming superiority
- Let **technical details** demonstrate quality rather than adjectives

## Technical Accuracy

### Verification Process

1. **Search codebase** for claimed features using relevant keywords
2. **Check API exports** - verify methods/classes mentioned are actually exported
3. **Review examples** - ensure described use cases have working implementations
4. **Test extensibility claims** - confirm developers can actually build described customizations

### Accuracy Standards

- **No aspirational features** - Only describe what actually exists and works today
- **Verify specific numbers** - "Nine arrowhead types" must be exactly nine, not "about nine"
- **Check API availability** - Don't mention internal-only functionality
- **Confirm behaviors** - "Automatically routes around obstacles" must be implemented, not planned

## Formatting & Structure

- Use clear headings to organize content hierarchically
- Implement consistent formatting for code examples and API references
- Use bullet points and lists for better scannability
- Maintain visual hierarchy with proper markdown formatting
- Include practical code snippets when relevant to demonstrate usage

## Common Pitfalls to Avoid

### Technical Marketing Mistakes

- **Over-promising capabilities** - Don't describe ideal future state as current reality
- **Generic benefit language** - Avoid "increase productivity" without specific context
- **Feature laundry lists** - Focus on outcomes, not just capabilities
- **Internal jargon** - Don't use tldraw team terminology unfamiliar to developers

### SDK-Specific Pitfalls

- **Confusing SDK with product** - Don't describe end-user experiences as developer benefits
- **Underestimating integration complexity** - Be realistic about implementation effort
- **Ignoring developer context** - Remember readers are evaluating tools, not learning to use them
- **Missing the "why"** - Always connect features to developer problems they solve

### Language and Style Errors

- **Passive voice overuse** - "Can be extended" vs "You can extend"
- **Vague quantifiers** - "Many options" vs "Nine arrowhead types"
- **Buzzword inflation** - "Revolutionary" vs specific technical advantages
- **Inconsistent terminology** - Pick one term for each concept and stick with it

## Quality Gates Checklist

### Before Submitting Content

- [ ] **Audience check**: Would a senior React developer find this useful and credible?
- [ ] **Fact verification**: Have all technical claims been checked against the codebase?
- [ ] **Voice consistency**: Does this sound like a knowledgeable colleague, not a salesperson?
- [ ] **Practical focus**: Is it clear what developers can build and why they'd want to?
- [ ] **Jargon balance**: Are tldraw-specific terms explained without over-explaining React concepts?
- [ ] **Sentence variety**: Mix of short punchy statements and longer explanatory sentences?
- [ ] **Value prop clarity**: Does each section reinforce either "great out-of-box UX" or "extensible foundation"?
- [ ] **Example specificity**: Are use cases concrete rather than abstract?
- [ ] **API accuracy**: Are mentioned methods/classes actually exported and usable?
- [ ] **Global accessibility**: Would this make sense to developers worldwide?
