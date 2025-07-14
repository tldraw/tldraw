---
title: Tool Chain Editor Advanced
component: ./index.tsx
category: use-cases
priority: 0
keywords: [tool-chain, workflow, toolset, advanced, dynamic-loading, categories]
hide: false
multiplayer: false
---

# Tool Chain Editor Advanced

## Overview

Tool Chain Editor Advanced is an enhanced version of the original Tool Chain Editor, providing more powerful toolset management, dynamic loading, and category organization features.

## Main Features

### Toolset Management
- **Multi-toolset support**: Each toolset contains multiple related tools
- **Category management**: Organize tools by function (Text Analysis, Data Analysis, AI/ML, File Management)
- **Dynamic loading**: Dynamically load new toolsets from the backend
- **Search & filter**: Real-time search for tools and toolsets

### Enhanced Features
- **Hybrid architecture**: Support both API-based and local processing tools
- **Standardized interface**: Unified tool definition format
- **Metadata support**: Detailed metadata for tools and toolsets
- **Statistics**: Detailed tool usage statistics

### User Experience
- **Intuitive UI**: Toolset grouping display
- **Detailed info**: View tool input/output formats
- **Visual feedback**: Different colors for local and API tools
- **Loading state**: Real-time processing status display

## File Structure

```
tool-chain-editor-advanced/
├── README.md                           # Project documentation
├── ARCHITECTURE_SUMMARY.md             # Architecture summary
├── enhanced-tool-registry.ts           # Enhanced tool registry
├── enhanced-toolbar.tsx                # Enhanced toolbar
├── enhanced-tool-chain-editor.tsx      # Main editor component
├── enhanced-backend-example.py         # Backend API example
├── enhanced-example.tsx                # Complete usage example
```

## Quick Start

### 1. Start the Project

```bash
yarn dev
```

Then open [http://localhost:5420/tool-chain-editor-advanced](http://localhost:5420/tool-chain-editor-advanced) in your browser.



### 2. Start Backend Service

```bash
cd apps/examples/src/examples/tool-chain-editor-advanced
python enhanced-backend-example.py
```

The backend service will start at `http://localhost:5000`.

---

## How to Define a New ToolSet and Tools

To add your own toolset and tools, follow these steps:

### 1. Define Your ToolSet and Tools

**File:**  
`enhanced-tool-registry.ts`

**What to do:**  
- At the top or in the exported section, define your new `ToolSet` object.
- Each tool is an object in the `tools` array of the toolset.

**Example:**
```typescript
// In enhanced-tool-registry.ts

export const myCustomToolSet: ToolSet = {
  id: 'my-custom-tools',
  name: 'My Custom Tools',
  description: 'A set of custom tools for demonstration',
  category: 'Custom',
  icon: '🛠️',
  metadata: {
    version: '1.0.0',
    author: 'Your Name',
    lastUpdated: new Date().toISOString(),
    tags: ['custom', 'demo']
  },
  tools: [
    {
      id: 'my-processor',
      name: 'My Processor',
      type: 'process',
      description: 'A custom data processor',
      config: {
        parameters: { customParam: 'value' }
      },
      inputSchema: { data: { type: 'object', required: true } },
      outputSchema: { result: { type: 'object' } }
    }
    // Add more tools here
  ]
};
```

---

### 2. Register Your ToolSet

**File:**  
`enhanced-tool-registry.ts`

**What to do:**  
- Add your new toolset to the `defaultToolSets` array so it appears in the UI.

**Example:**
```typescript
// In enhanced-tool-registry.ts

export const defaultToolSets: ToolSet[] = [
  textProcessingToolSet,
  dataProcessingToolSet,
  aiMlToolSet,
  fileProcessingToolSet,
  myCustomToolSet // <-- Add your toolset here
];
```

---

### 3. (Optional) Implement Backend Logic

If your tool is API-based (has `apiEndpoint`),  
**File:**  
`enhanced-backend-example.py` (or your real backend)

**What to do:**  
- Add a new API endpoint matching your tool's `id` for tool execution.
- Implement the logic to process requests and return results.

**For detailed implementation guide, see:** `BACKEND_USAGE_GUIDE.md`

---

### 4. (Optional) Add Local Tool Logic

If your tool is local (no `apiEndpoint`),  
**File:**  
`enhanced-tool-chain-editor.tsx`

**What to do:**  
- In the `handleLocalToolExecution` function, add a case for your tool's `id` to implement its logic.

**Example:**
```typescript
// In enhanced-tool-chain-editor.tsx

async function handleLocalToolExecution(tool: ToolDefinition, input: any) {
  if (tool.id === 'my-processor') {
    // Your custom logic here
    return { result: { ...input.data, processed: true } };
  }
  // ...other logic
}
```

---

## Summary Table

| Step | File | What to Edit |
|------|------|--------------|
| 1. Define ToolSet & Tools | enhanced-tool-registry.ts | Add new ToolSet object |
| 2. Register ToolSet      | enhanced-tool-registry.ts | Add to `defaultToolSets` array |
| 3. Backend API (if needed) | enhanced-backend-example.py | Add API endpoint for your tool |
| 4. Local Logic (if needed) | enhanced-tool-chain-editor.tsx | Add logic in `handleLocalToolExecution` |

---

This structure makes it clear where to add new toolsets and tools, and how to connect frontend and backend logic.  
If you need a more detailed code template for any step, let me know! 