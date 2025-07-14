# Tool Chain Editor 完整指南

## 概述

Tool Chain Editor 是一个基于 React Flow 的可视化工作流编辑器，允许用户通过拖拽方式创建和连接各种工具节点，构建数据处理管道。系统支持两种类型的工具：

1. **API工具** - 需要调用外部API的工具
2. **本地工具** - 在浏览器中直接处理的工具

## 系统架构

### 1. 前端架构

```
ToolChainEditor (主组件)
├── ToolRegistry (工具注册表)
├── ToolAPIService (API服务)
├── Node Components (节点组件)
│   ├── InputNode (输入节点)
│   ├── AgentNode (代理节点)
│   ├── ProcessNode (处理节点)
│   └── OutputNode (输出节点)
└── Toolbar (工具栏)
```

### 2. 后端架构

```
Flask Backend
├── Tools Registry (工具注册表)
├── Tool Processors (工具处理器)
├── API Endpoints (API端点)
└── Workflow Management (工作流管理)
```

## 核心概念

### ToolDefinition 接口

```typescript
interface ToolDefinition {
  id: string;           // 工具唯一标识
  name: string;         // 工具显示名称
  type: 'input' | 'agent' | 'process' | 'output';  // 工具类型
  description: string;  // 工具描述
  config: {
    apiEndpoint?: string;        // API端点（可选）
    parameters?: Record<string, any>;  // 工具参数
    headers?: Record<string, string>;  // HTTP头
    apiKey?: string;            // API密钥
  };
  inputSchema?: Record<string, any>;   // 输入数据格式
  outputSchema?: Record<string, any>;  // 输出数据格式
}
```

### 工具类型说明

- **input**: 数据输入节点，用户输入数据
- **agent**: AI/API处理节点，调用外部服务
- **process**: 数据处理节点，本地或远程处理
- **output**: 结果输出节点，显示最终结果

## 如何添加新工具

### 步骤1: 定义工具

#### 1.1 API工具示例

```typescript
// custom-tools-example.ts
export const translationTool: ToolDefinition = {
  id: 'text-translator',
  name: 'Text Translator',
  type: 'agent',
  description: 'Translate text between different languages',
  config: {
    apiEndpoint: 'https://api.translate.com/v1/translate',
    apiKey: 'your-translation-api-key',
    parameters: {
      source_lang: 'en',
      target_lang: 'zh',
    },
    headers: {
      'Content-Type': 'application/json',
    },
  },
  inputSchema: {
    text: { type: 'string', required: true },
    target_language: { type: 'string', required: false },
  },
  outputSchema: {
    translated_text: { type: 'string' },
    source_language: { type: 'string' },
    target_language: { type: 'string' },
  },
};
```

#### 1.2 本地工具示例

```typescript
export const textAnalyzerTool: ToolDefinition = {
  id: 'text-analyzer',
  name: 'Text Analyzer',
  type: 'process',
  description: 'Analyze text locally without API calls',
  config: {
    // 没有apiEndpoint，表示这是本地处理工具
    parameters: {
      enable_sentiment: true,
      enable_keywords: true,
      max_keywords: 10,
    },
  },
  inputSchema: {
    text: { type: 'string', required: true },
  },
  outputSchema: {
    word_count: { type: 'number' },
    character_count: { type: 'number' },
    sentence_count: { type: 'number' },
    average_word_length: { type: 'number' },
    keywords: { type: 'array' },
    sentiment_score: { type: 'number' },
  },
};
```

### 步骤2: 实现工具处理器

#### 2.1 本地工具处理器

```typescript
export class LocalToolProcessor {
  static async processTextAnalyzer(input: any, config: any): Promise<any> {
    const { text } = input;
    const { enable_sentiment, enable_keywords, max_keywords } = config.parameters;
    
    // 基本文本统计
    const words = text.split(/\s+/).filter((word: string) => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter((sentence: string) => sentence.trim().length > 0);
    const characters = text.replace(/\s/g, '').length;
    
    const result: any = {
      word_count: words.length,
      character_count: characters,
      sentence_count: sentences.length,
      average_word_length: words.length > 0 ? 
        words.reduce((sum: number, word: string) => sum + word.length, 0) / words.length : 0,
    };
    
    // 关键词提取
    if (enable_keywords) {
      const wordFreq: Record<string, number> = {};
      words.forEach((word: string) => {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        if (cleanWord.length > 2) {
          wordFreq[cleanWord] = (wordFreq[cleanWord] || 0) + 1;
        }
      });
      
      result.keywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, max_keywords)
        .map(([word]) => word);
    }
    
    // 情感分析
    if (enable_sentiment) {
      const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'love', 'like'];
      const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'horrible'];
      
      const positiveCount = words.filter((word: string) => 
        positiveWords.includes(word.toLowerCase())
      ).length;
      const negativeCount = words.filter((word: string) => 
        negativeWords.includes(word.toLowerCase())
      ).length;
      
      result.sentiment_score = positiveCount - negativeCount;
    }
    
    return result;
  }
}
```

#### 2.2 扩展API服务

```typescript
export class ExtendedToolAPIService {
  constructor(private toolRegistry: any) {}
  
  async executeTool(toolId: string, input: any): Promise<any> {
    const tool = this.toolRegistry.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    
    // 检查是否是本地处理工具
    if (!tool.config.apiEndpoint) {
      return this.executeLocalTool(toolId, input, tool);
    }
    
    // 执行API工具
    return this.executeAPITool(toolId, input, tool);
  }
  
  private async executeLocalTool(toolId: string, input: any, tool: ToolDefinition): Promise<any> {
    switch (toolId) {
      case 'text-analyzer':
        return LocalToolProcessor.processTextAnalyzer(input, tool);
      case 'json-formatter':
        return LocalToolProcessor.processJsonFormatter(input, tool);
      default:
        throw new Error(`Local tool ${toolId} not implemented`);
    }
  }
  
  private async executeAPITool(toolId: string, input: any, tool: ToolDefinition): Promise<any> {
    const requestBody = {
      ...tool.config.parameters,
      ...input,
    };
    
    const response = await fetch(tool.config.apiEndpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(tool.config.apiKey && { Authorization: `Bearer ${tool.config.apiKey}` }),
        ...tool.config.headers,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      throw new Error(`API call failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
}
```

### 步骤3: 后端实现（可选）

如果你需要后端支持，可以创建Python Flask后端：

```python
# backend-example.py
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 工具注册表
TOOLS_REGISTRY = {
    "text-processor": {
        "id": "text-processor",
        "name": "Text Processor",
        "type": "process",
        "description": "Process and analyze text content",
        "config": {
            "apiEndpoint": "/api/tools/text-processor",
            "parameters": {
                "maxLength": 1000,
                "language": "en"
            }
        },
        "inputSchema": {
            "text": {"type": "string", "required": True}
        },
        "outputSchema": {
            "processedText": {"type": "string"},
            "analysis": {"type": "object"}
        }
    }
}

class ToolProcessor:
    @staticmethod
    def process_text_processor(input_data):
        text = input_data.get("text", "")
        max_length = input_data.get("maxLength", 1000)
        language = input_data.get("language", "en")
        
        # 文本处理逻辑
        processed_text = text[:max_length]
        if language == "en":
            processed_text = processed_text.upper()
        
        # 文本分析
        words = text.split()
        analysis = {
            "wordCount": len(words),
            "characterCount": len(text.replace(" ", "")),
            "language": language,
        }
        
        return {
            "processedText": processed_text,
            "analysis": analysis
        }

@app.route('/api/tools/text-processor', methods=['POST'])
def text_processor():
    data = request.get_json()
    result = ToolProcessor.process_text_processor(data)
    return jsonify({
        "success": True,
        "result": result
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
```

### 步骤4: 集成到前端

```typescript
// integration-example.tsx
import { customTools } from './custom-tools-example';
import { ExtendedToolAPIService } from './custom-tools-example';

export default function ExtendedToolChainEditor({ tools = customTools }) {
  const toolRegistry = new ToolRegistry(tools);
  const apiService = new ExtendedToolAPIService(toolRegistry);
  
  // 使用扩展的API服务
  const executeWorkflow = async () => {
    // 执行工作流逻辑
    const result = await apiService.executeTool('text-analyzer', {
      text: 'This is a great example!'
    });
    console.log('Result:', result);
  };
  
  return (
    <ToolChainEditor 
      tools={tools} 
      onWorkflowChange={handleWorkflowChange}
    />
  );
}
```

## 工作流执行机制

### 1. 数据流

```
Input Node → Process/Agent Node → Output Node
     ↓              ↓                ↓
  用户输入      工具处理          结果显示
```

### 2. 执行顺序

系统使用拓扑排序确保节点按正确顺序执行：

```typescript
function topologicalSort(nodes: any[], edges: any[]): any[] {
  const graph: Record<string, string[]> = {};
  const inDegree: Record<string, number> = {};
  
  // 初始化
  nodes.forEach(node => {
    graph[node.id] = [];
    inDegree[node.id] = 0;
  });
  
  // 构建图
  edges.forEach(edge => {
    graph[edge.source].push(edge.target);
    inDegree[edge.target]++;
  });
  
  // 拓扑排序
  const queue: string[] = [];
  const result: any[] = [];
  
  // 找到入度为0的节点
  Object.keys(inDegree).forEach(nodeId => {
    if (inDegree[nodeId] === 0) {
      queue.push(nodeId);
    }
  });
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(nodes.find(node => node.id === current));
    
    graph[current].forEach(neighbor => {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }
  
  return result;
}
```

### 3. 数据传递

```typescript
function getNodeInput(nodeId: string, workflow: any, results: Record<string, any>): any {
  const incomingEdges = workflow.edges.filter((edge: any) => edge.target === nodeId);
  
  if (incomingEdges.length === 0) {
    return null;
  }
  
  if (incomingEdges.length === 1) {
    const sourceNode = workflow.nodes.find((node: any) => node.id === incomingEdges[0].source);
    return results[sourceNode.id] || sourceNode.data.value || '';
  }
  
  // 多个输入的情况
  const inputs = incomingEdges.map((edge: any) => {
    const sourceNode = workflow.nodes.find((node: any) => node.id === edge.source);
    return results[sourceNode.id] || sourceNode.data.value || '';
  });
  
  return inputs;
}
```

## 使用示例

### 1. 基本使用

```typescript
import ToolChainEditor from './ToolChainEditor';
import { customTools } from './custom-tools-example';

function App() {
  return (
    <ToolChainEditor 
      tools={customTools}
      onWorkflowChange={(workflow) => {
        console.log('Workflow changed:', workflow);
      }}
    />
  );
}
```

### 2. 扩展使用

```typescript
import ExtendedToolChainEditor from './integration-example';

function App() {
  return <ExtendedToolChainEditor tools={customTools} />;
}
```

### 3. 后端集成

```typescript
// 从后端加载工具
async function loadToolsFromBackend(): Promise<ToolDefinition[]> {
  try {
    const response = await fetch('/api/tools');
    const backendTools = await response.json();
    return [...customTools, ...backendTools.tools];
  } catch (error) {
    console.error('Failed to load tools from backend:', error);
    return customTools;
  }
}

// 保存工作流到后端
async function saveWorkflowToBackend(workflow: any): Promise<void> {
  try {
    await fetch('/api/workflows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(workflow),
    });
  } catch (error) {
    console.error('Failed to save workflow:', error);
  }
}
```

## 最佳实践

### 1. 工具设计原则

- **单一职责**: 每个工具只做一件事
- **标准化接口**: 使用统一的输入输出格式
- **错误处理**: 提供清晰的错误信息
- **文档化**: 详细描述工具的功能和参数

### 2. 性能优化

- **本地处理**: 优先使用本地处理工具
- **缓存结果**: 缓存重复的计算结果
- **异步处理**: 使用异步API避免阻塞
- **批量处理**: 支持批量数据处理

### 3. 安全性

- **输入验证**: 验证所有输入数据
- **API密钥管理**: 安全存储API密钥
- **错误信息**: 避免暴露敏感信息
- **CORS配置**: 正确配置跨域请求

## 故障排除

### 常见问题

1. **工具不显示**: 检查工具类型是否正确注册
2. **API调用失败**: 检查API端点和认证信息
3. **数据传递错误**: 检查输入输出格式是否匹配
4. **工作流执行失败**: 检查节点依赖关系

### 调试技巧

1. 使用浏览器开发者工具查看网络请求
2. 检查控制台错误信息
3. 验证工具定义格式
4. 测试单个工具功能

## 扩展功能

### 1. 自定义节点类型

```typescript
// 添加新的节点类型
function CustomNode({ data, id }: NodeProps) {
  return (
    <div style={{
      padding: 10,
      background: '#your-color',
      border: '2px solid #your-border',
      borderRadius: 10,
    }}>
      <strong>Custom Node</strong>
      <div>{data.value}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  );
}

// 注册新节点类型
const nodeTypes = {
  inputNode: InputNode,
  agentNode: AgentNode,
  outputNode: OutputNode,
  processNode: ProcessNode,
  customNode: CustomNode, // 新增
};
```

### 2. 条件分支

```typescript
// 支持条件分支的工具
export const conditionalTool: ToolDefinition = {
  id: 'conditional-processor',
  name: 'Conditional Processor',
  type: 'process',
  description: 'Process data based on conditions',
  config: {
    parameters: {
      condition: 'length > 100',
      trueAction: 'uppercase',
      falseAction: 'lowercase',
    },
  },
  inputSchema: {
    text: { type: 'string', required: true },
  },
  outputSchema: {
    result: { type: 'string' },
    condition_met: { type: 'boolean' },
  },
};
```

### 3. 循环处理

```typescript
// 支持循环处理的工具
export const loopProcessor: ToolDefinition = {
  id: 'loop-processor',
  name: 'Loop Processor',
  type: 'process',
  description: 'Process data in loops',
  config: {
    parameters: {
      maxIterations: 10,
      condition: 'result.length < 100',
    },
  },
  inputSchema: {
    data: { type: 'array', required: true },
  },
  outputSchema: {
    result: { type: 'array' },
    iterations: { type: 'number' },
  },
};
```

## 总结

Tool Chain Editor 提供了一个灵活、可扩展的可视化工作流编辑系统。通过标准化的工具定义接口，你可以轻松添加新的API工具或本地处理工具。系统支持复杂的数据流处理，包括条件分支、循环处理等高级功能。

关键优势：

1. **可视化编辑**: 拖拽式界面，直观易用
2. **灵活扩展**: 支持自定义工具和节点类型
3. **混合架构**: 同时支持API和本地处理
4. **标准化接口**: 统一的工具定义格式
5. **错误处理**: 完善的错误处理和调试支持

通过这个系统，你可以快速构建复杂的数据处理管道，提高开发效率。 