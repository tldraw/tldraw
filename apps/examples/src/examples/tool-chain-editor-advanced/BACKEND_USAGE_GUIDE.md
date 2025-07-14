# Backend Logic Implementation Guide

## Overview

This guide explains how to implement backend logic for your custom tools in the Tool Chain Editor Advanced.

## Architecture

The system has two main components:

1. **Frontend (React/TypeScript)**: UI and workflow management
2. **Backend (Python/Flask)**: Tool execution and data processing

## How It Works

### 1. Tool Definition Flow

```
Frontend Tool Definition → Backend API → Tool Execution → Results
```

### 2. Communication Pattern

- **Tool Definition**: Frontend loads tool metadata from backend
- **Tool Execution**: Frontend sends data to backend API endpoint
- **Results**: Backend processes data and returns results to frontend

## Step-by-Step Implementation

### Step 1: Define Your Tool in Backend

Add your tool to the `TOOLSETS_REGISTRY` in `enhanced-backend-example.py`:

```python
"my-custom-toolset": {
    "id": "my-custom-toolset",
    "name": "My Custom Tools",
    "description": "Custom tools for my business needs",
    "category": "Custom",
    "icon": "🔧",
    "metadata": {
        "version": "1.0.0",
        "author": "Your Name",
        "lastUpdated": datetime.now().isoformat(),
        "tags": ["custom", "business"]
    },
    "tools": [
        {
            "id": "my-custom-tool",
            "name": "My Custom Tool",
            "type": "process",  # or "agent"
            "description": "What this tool does",
            "config": {
                "apiEndpoint": "/api/tools/my-custom-tool",  # Your API endpoint
                "parameters": {
                    "param1": "value1",
                    "param2": "value2",
                },
            },
            "inputSchema": {
                "input_field": {"type": "string", "required": True},
            },
            "outputSchema": {
                "result": {"type": "string"},
                "status": {"type": "boolean"},
            },
        }
    ]
}
```

### Step 2: Implement Tool Logic

Create a processor class in your backend:

```python
class MyCustomToolProcessor:
    @staticmethod
    def process_my_custom_tool(input_data):
        """
        Your tool logic here
        """
        # Extract input
        input_field = input_data.get('input_field', '')
        param1 = input_data.get('param1', 'default_value')
        
        # Your processing logic
        result = f"Processed: {input_field} with {param1}"
        status = True
        
        return {
            "result": result,
            "status": status
        }
```

### Step 3: Create API Endpoint

Add an API endpoint in your backend:

```python
@app.route('/api/tools/my-custom-tool', methods=['POST'])
def my_custom_tool():
    try:
        data = request.get_json()
        
        if not data or 'input_field' not in data:
            return jsonify({"error": "Missing required field"}), 400
        
        # Process the tool
        result = MyCustomToolProcessor.process_my_custom_tool(data)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"Processing error: {str(e)}"}), 500
```

### Step 4: Frontend Integration

Add your tool to the frontend registry in `enhanced-tool-registry.ts`:

```typescript
export const myCustomToolSet: ToolSet = {
    id: 'my-custom-toolset',
    name: 'My Custom Tools',
    description: 'Custom tools for my business needs',
    category: 'Custom',
    icon: '🔧',
    metadata: {
        version: '1.0.0',
        author: 'Your Name',
        lastUpdated: new Date().toISOString(),
        tags: ['custom', 'business']
    },
    tools: [
        {
            id: 'my-custom-tool',
            name: 'My Custom Tool',
            type: 'process',
            description: 'What this tool does',
            config: {
                apiEndpoint: '/api/tools/my-custom-tool',  // Points to your backend
                parameters: {
                    param1: 'value1',
                    param2: 'value2',
                },
            },
            inputSchema: {
                input_field: { type: 'string', required: true },
            },
            outputSchema: {
                result: { type: 'string' },
                status: { type: 'boolean' },
            },
        }
    ]
};

// Add to default toolsets
export const defaultToolSets: ToolSet[] = [
    // ... existing toolsets
    myCustomToolSet,
];
```

## Usage Examples

### Example 1: Simple Data Processing Tool

**Backend Implementation:**
```python
@app.route('/api/tools/text-counter', methods=['POST'])
def text_counter():
    data = request.get_json()
    text = data.get('text', '')
    
    result = {
        "character_count": len(text),
        "word_count": len(text.split()),
        "line_count": len(text.splitlines()),
        "uppercase_count": sum(1 for c in text if c.isupper())
    }
    
    return jsonify(result)
```

**Frontend Definition:**
```typescript
{
    id: 'text-counter',
    name: 'Text Counter',
    type: 'process',
    description: 'Count characters, words, and lines in text',
    config: {
        apiEndpoint: '/api/tools/text-counter',
    },
    inputSchema: {
        text: { type: 'string', required: true },
    },
    outputSchema: {
        character_count: { type: 'number' },
        word_count: { type: 'number' },
        line_count: { type: 'number' },
        uppercase_count: { type: 'number' },
    },
}
```

### Example 2: AI-Powered Tool

**Backend Implementation:**
```python
@app.route('/api/tools/sentiment-analyzer', methods=['POST'])
def sentiment_analyzer():
    data = request.get_json()
    text = data.get('text', '')
    
    # Your AI logic here
    # This could call OpenAI, Hugging Face, or your own model
    sentiment_score = analyze_sentiment(text)  # Your function
    
    result = {
        "sentiment": "positive" if sentiment_score > 0.5 else "negative",
        "score": sentiment_score,
        "confidence": 0.85
    }
    
    return jsonify(result)
```

## Testing Your Tool

### 1. Start Backend Server
```bash
cd apps/examples/src/examples/tool-chain-editor-advanced
python enhanced-backend-example.py
```

### 2. Test API Endpoint
```bash
curl -X POST http://localhost:5000/api/tools/my-custom-tool \
  -H "Content-Type: application/json" \
  -d '{"input_field": "test data"}'
```

### 3. Use in Frontend
1. Open the Tool Chain Editor
2. Your tool should appear in the Tool Library
3. Drag it to the canvas
4. Connect it to other nodes
5. Enter input data and execute