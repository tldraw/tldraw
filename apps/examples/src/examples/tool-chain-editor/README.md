---
title: Tool Chain Editor
component: ./index.tsx
category: use-cases
priority: 0
keywords: [tool-chain, workflow, drag-drop, node-editor, api-integration]
---

A visual tool chain editor that allows you to define backend tools and drag/drop them to create workflows.

---

## Overview

The Tool Chain Editor is a React Flow-based visual editor that enables you to:
- Define backend tools as configurable nodes
- Drag and drop tools to create workflows
- Connect tools to form processing chains
- Execute workflows with API calls

## Backend Tool Definition

### 1. Tool Schema

Define your backend tools using a standardized schema:

```typescript
interface ToolDefinition {
  id: string;
  name: string;
  type: 'input' | 'agent' | 'process' | 'output';
  description: string;
  config: {
    apiEndpoint?: string;
    parameters?: Record<string, any>;
    headers?: Record<string, string>;
  };
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;
}
```

### 2. Backend API Structure

```typescript
// Example backend tool definition
const tools = [
  {
    id: 'text-processor',
    name: 'Text Processor',
    type: 'process',
    description: 'Process and analyze text content',
    config: {
      apiEndpoint: '/api/tools/text-processor',
      parameters: {
        maxLength: 1000,
        language: 'en'
      }
    },
    inputSchema: {
      text: { type: 'string', required: true }
    },
    outputSchema: {
      processedText: { type: 'string' },
      analysis: { type: 'object' }
    }
  },
  {
    id: 'ai-agent',
    name: 'AI Agent',
    type: 'agent',
    description: 'AI-powered content generation',
    config: {
      apiEndpoint: '/api/tools/ai-agent',
      headers: {
        'Authorization': 'Bearer YOUR_API_KEY'
      }
    }
  }
];
```

### 3. Backend Implementation

```python
# Python Flask example
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/tools/text-processor', methods=['POST'])
def text_processor():
    data = request.json
    text = data.get('text', '')
    
    # Process the text
    processed_text = text.upper()
    analysis = {
        'length': len(text),
        'word_count': len(text.split())
    }
    
    return jsonify({
        'processedText': processed_text,
        'analysis': analysis
    })

@app.route('/api/tools/ai-agent', methods=['POST'])
def ai_agent():
    data = request.json
    query = data.get('query', '')
    
    # Call AI service (e.g., OpenAI, DeepSeek)
    response = call_ai_service(query)
    
    return jsonify({
        'result': response
    })
```

## Frontend Tool Chain Editor

### 1. Node Types

The editor supports four main node types:

- **Input Node**: Data entry points
- **Agent Node**: AI/API processing nodes
- **Process Node**: Data transformation nodes  
- **Output Node**: Result display nodes

### 2. Drag & Drop Workflow

```typescript
// Example workflow creation
const workflow = {
  nodes: [
    {
      id: 'input-1',
      type: 'inputNode',
      position: { x: 100, y: 200 },
      data: { value: '', type: 'text' }
    },
    {
      id: 'agent-1', 
      type: 'agentNode',
      position: { x: 400, y: 200 },
      data: { 
        toolId: 'ai-agent',
        config: { model: 'gpt-4' }
      }
    },
    {
      id: 'output-1',
      type: 'outputNode', 
      position: { x: 700, y: 200 },
      data: { format: 'json' }
    }
  ],
  edges: [
    { id: 'e1', source: 'input-1', target: 'agent-1' },
    { id: 'e2', source: 'agent-1', target: 'output-1' }
  ]
};
```

### 3. Tool Execution

```typescript
// Execute workflow
async function executeWorkflow(workflow) {
  const results = {};
  
  for (const node of workflow.nodes) {
    if (node.type === 'agentNode') {
      const tool = getToolById(node.data.toolId);
      const input = getNodeInput(node.id, results);
      
      const response = await fetch(tool.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...tool.config.headers
        },
        body: JSON.stringify(input)
      });
      
      results[node.id] = await response.json();
    }
  }
  
  return results;
}
```

## Usage

### 1. Add Tools to Toolbar

Click the toolbar buttons to add different node types:
- **Add Input**: Create data input nodes
- **Add Agent**: Add AI/API processing nodes
- **Add Process**: Add data transformation nodes
- **Add Output**: Create result display nodes

### 2. Connect Nodes

- Drag from a node's output handle to another node's input handle
- Connections are animated and show data flow direction
- Click on connections to delete them

### 3. Configure Nodes

- Input nodes: Enter text and press Enter to submit
- Agent nodes: Automatically process input and call APIs
- Process nodes: Transform data between nodes
- Output nodes: Display final results

### 4. Execute Workflows

- Enter text in input nodes
- Watch as data flows through connected nodes
- View results in output nodes

## Customization

### Adding New Tool Types

1. Define the tool in your backend
2. Add a new node component in `ToolChainEditor.tsx`
3. Register the node type in the `nodeTypes` object
4. Add a toolbar button for the new tool

### Styling Nodes

Customize node appearance by modifying the style objects in each node component:

```typescript
function CustomNode({ data, id }) {
  return (
    <div style={{
      padding: 18,
      background: '#your-color',
      border: '2px solid #your-border',
      borderRadius: 10,
      minWidth: 260,
      maxWidth: 400,
    }}>
      {/* Node content */}
    </div>
  );
}
```

## API Integration

The editor supports integration with various AI/API services:

- **DeepSeek API**: Already integrated in the example
- **OpenAI API**: Add your API key and endpoint
- **Custom APIs**: Define your own endpoints and parameters

## Full Screen Mode

Click the "🚀 进入 Tool Chain Editor" button to enter full-screen mode for a better editing experience.

## Dependencies

- React Flow: For the visual node editor
- React: For the UI components
- Fetch API: For making HTTP requests to backend tools