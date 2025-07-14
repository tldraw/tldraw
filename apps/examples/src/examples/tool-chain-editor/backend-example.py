#!/usr/bin/env python3
"""
Tool Chain Editor Backend Example
展示如何在后端定义和提供工具API
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import re
import hashlib
from datetime import datetime
from typing import Dict, Any, List
import logging

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== 工具定义 ====================

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
    },
    
    "sentiment-analyzer": {
        "id": "sentiment-analyzer",
        "name": "Sentiment Analyzer",
        "type": "process",
        "description": "Analyze text sentiment using local processing",
        "config": {
            "parameters": {
                "algorithm": "keyword-based",
                "threshold": 0.5
            }
        },
        "inputSchema": {
            "text": {"type": "string", "required": True}
        },
        "outputSchema": {
            "sentiment": {"type": "string"},
            "score": {"type": "number"},
            "confidence": {"type": "number"}
        }
    },
    
    "data-transformer": {
        "id": "data-transformer",
        "name": "Data Transformer",
        "type": "process",
        "description": "Transform data between different formats",
        "config": {
            "parameters": {
                "outputFormat": "json",
                "includeMetadata": True
            }
        },
        "inputSchema": {
            "data": {"type": "object", "required": True},
            "transformType": {"type": "string", "required": False}
        },
        "outputSchema": {
            "transformedData": {"type": "object"},
            "metadata": {"type": "object"}
        }
    },
    
    "file-processor": {
        "id": "file-processor",
        "name": "File Processor",
        "type": "process",
        "description": "Process files (text, images, etc.)",
        "config": {
            "parameters": {
                "maxFileSize": 10485760,  # 10MB
                "allowedTypes": ["txt", "json", "csv"]
            }
        },
        "inputSchema": {
            "fileContent": {"type": "string", "required": True},
            "fileType": {"type": "string", "required": True}
        },
        "outputSchema": {
            "processedContent": {"type": "string"},
            "fileInfo": {"type": "object"},
            "statistics": {"type": "object"}
        }
    }
}

# ==================== 工具处理器 ====================

class ToolProcessor:
    """工具处理器基类"""
    
    @staticmethod
    def process_text_processor(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """文本处理器"""
        text = input_data.get("text", "")
        max_length = input_data.get("maxLength", 1000)
        language = input_data.get("language", "en")
        
        # 文本处理逻辑
        processed_text = text[:max_length]  # 截断到最大长度
        if language == "en":
            processed_text = processed_text.upper()
        elif language == "zh":
            processed_text = processed_text.lower()
        
        # 文本分析
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        characters = len(text.replace(" ", ""))
        
        analysis = {
            "wordCount": len(words),
            "sentenceCount": len([s for s in sentences if s.strip()]),
            "characterCount": characters,
            "averageWordLength": sum(len(word) for word in words) / len(words) if words else 0,
            "language": language,
            "processedAt": datetime.now().isoformat()
        }
        
        return {
            "processedText": processed_text,
            "analysis": analysis
        }
    
    @staticmethod
    def process_sentiment_analyzer(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """情感分析器"""
        text = input_data.get("text", "").lower()
        algorithm = input_data.get("algorithm", "keyword-based")
        threshold = input_data.get("threshold", 0.5)
        
        # 简单的情感分析（基于关键词）
        positive_words = {
            "good", "great", "excellent", "amazing", "wonderful", "love", "like", 
            "happy", "joy", "pleased", "satisfied", "perfect", "fantastic"
        }
        negative_words = {
            "bad", "terrible", "awful", "hate", "dislike", "horrible", "worst",
            "sad", "angry", "disappointed", "frustrated", "annoyed", "upset"
        }
        
        words = set(re.findall(r'\b\w+\b', text))
        positive_count = len(words.intersection(positive_words))
        negative_count = len(words.intersection(negative_words))
        
        total_sentiment_words = positive_count + negative_count
        if total_sentiment_words == 0:
            score = 0
            sentiment = "neutral"
            confidence = 0.0
        else:
            score = (positive_count - negative_count) / total_sentiment_words
            if score > threshold:
                sentiment = "positive"
            elif score < -threshold:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            confidence = min(abs(score), 1.0)
        
        return {
            "sentiment": sentiment,
            "score": score,
            "confidence": confidence,
            "positiveWords": positive_count,
            "negativeWords": negative_count,
            "analyzedAt": datetime.now().isoformat()
        }
    
    @staticmethod
    def process_data_transformer(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """数据转换器"""
        data = input_data.get("data", {})
        transform_type = input_data.get("transformType", "format")
        output_format = input_data.get("outputFormat", "json")
        include_metadata = input_data.get("includeMetadata", True)
        
        transformed_data = data.copy()
        metadata = {}
        
        if transform_type == "format":
            # 格式化数据
            if output_format == "json":
                transformed_data = json.dumps(data, indent=2, ensure_ascii=False)
            elif output_format == "compact":
                transformed_data = json.dumps(data, separators=(',', ':'))
        
        elif transform_type == "normalize":
            # 数据标准化
            if isinstance(data, dict):
                transformed_data = {k.lower().replace(" ", "_"): v for k, v in data.items()}
        
        elif transform_type == "validate":
            # 数据验证
            if isinstance(data, dict):
                required_fields = ["id", "name", "type"]
                missing_fields = [field for field in required_fields if field not in data]
                transformed_data["valid"] = len(missing_fields) == 0
                if missing_fields:
                    transformed_data["missingFields"] = missing_fields
        
        if include_metadata:
            metadata = {
                "transformType": transform_type,
                "outputFormat": output_format,
                "originalSize": len(str(data)),
                "transformedSize": len(str(transformed_data)),
                "transformedAt": datetime.now().isoformat()
            }
        
        return {
            "transformedData": transformed_data,
            "metadata": metadata
        }
    
    @staticmethod
    def process_file_processor(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """文件处理器"""
        file_content = input_data.get("fileContent", "")
        file_type = input_data.get("fileType", "txt")
        max_file_size = input_data.get("maxFileSize", 10485760)
        
        # 文件信息
        file_info = {
            "type": file_type,
            "size": len(file_content),
            "lines": len(file_content.splitlines()),
            "words": len(file_content.split()),
            "characters": len(file_content),
            "processedAt": datetime.now().isoformat()
        }
        
        # 检查文件大小
        if len(file_content) > max_file_size:
            return {
                "error": f"File too large. Maximum size: {max_file_size} bytes",
                "fileInfo": file_info
            }
        
        # 根据文件类型处理
        processed_content = file_content
        statistics = {}
        
        if file_type == "txt":
            # 文本文件处理
            processed_content = file_content.strip()
            statistics = {
                "paragraphs": len([p for p in file_content.split('\n\n') if p.strip()]),
                "averageLineLength": sum(len(line) for line in file_content.splitlines()) / len(file_content.splitlines()) if file_content.splitlines() else 0
            }
        
        elif file_type == "json":
            # JSON文件处理
            try:
                parsed_json = json.loads(file_content)
                processed_content = json.dumps(parsed_json, indent=2, ensure_ascii=False)
                statistics = {
                    "isValidJson": True,
                    "jsonDepth": ToolProcessor._calculate_json_depth(parsed_json),
                    "jsonKeys": ToolProcessor._count_json_keys(parsed_json)
                }
            except json.JSONDecodeError as e:
                processed_content = f"Invalid JSON: {str(e)}"
                statistics = {"isValidJson": False, "error": str(e)}
        
        elif file_type == "csv":
            # CSV文件处理
            lines = file_content.splitlines()
            if lines:
                headers = lines[0].split(',')
                data_rows = lines[1:]
                processed_content = f"Headers: {headers}\nRows: {len(data_rows)}"
                statistics = {
                    "columns": len(headers),
                    "rows": len(data_rows),
                    "hasHeaders": True
                }
        
        return {
            "processedContent": processed_content,
            "fileInfo": file_info,
            "statistics": statistics
        }
    
    @staticmethod
    def _calculate_json_depth(obj, current_depth=0):
        """计算JSON对象的深度"""
        if isinstance(obj, dict):
            if not obj:
                return current_depth
            return max(ToolProcessor._calculate_json_depth(v, current_depth + 1) for v in obj.values())
        elif isinstance(obj, list):
            if not obj:
                return current_depth
            return max(ToolProcessor._calculate_json_depth(item, current_depth + 1) for item in obj)
        else:
            return current_depth
    
    @staticmethod
    def _count_json_keys(obj):
        """计算JSON对象中的键数量"""
        if isinstance(obj, dict):
            return len(obj) + sum(ToolProcessor._count_json_keys(v) for v in obj.values())
        elif isinstance(obj, list):
            return sum(ToolProcessor._count_json_keys(item) for item in obj)
        else:
            return 0

# ==================== API路由 ====================

@app.route('/api/tools', methods=['GET'])
def get_tools():
    """获取所有可用工具"""
    try:
        tools_list = list(TOOLS_REGISTRY.values())
        return jsonify({
            "success": True,
            "tools": tools_list,
            "count": len(tools_list)
        })
    except Exception as e:
        logger.error(f"Error getting tools: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tools/<tool_id>', methods=['GET'])
def get_tool(tool_id):
    """获取特定工具信息"""
    try:
        if tool_id not in TOOLS_REGISTRY:
            return jsonify({
                "success": False,
                "error": f"Tool {tool_id} not found"
            }), 404
        
        return jsonify({
            "success": True,
            "tool": TOOLS_REGISTRY[tool_id]
        })
    except Exception as e:
        logger.error(f"Error getting tool {tool_id}: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tools/text-processor', methods=['POST'])
def text_processor():
    """文本处理器API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = ToolProcessor.process_text_processor(data)
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error in text processor: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tools/sentiment-analyzer', methods=['POST'])
def sentiment_analyzer():
    """情感分析器API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = ToolProcessor.process_sentiment_analyzer(data)
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error in sentiment analyzer: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tools/data-transformer', methods=['POST'])
def data_transformer():
    """数据转换器API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = ToolProcessor.process_data_transformer(data)
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error in data transformer: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tools/file-processor', methods=['POST'])
def file_processor():
    """文件处理器API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = ToolProcessor.process_file_processor(data)
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error in file processor: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/workflows', methods=['POST'])
def save_workflow():
    """保存工作流"""
    try:
        workflow = request.get_json()
        if not workflow:
            return jsonify({
                "success": False,
                "error": "No workflow data provided"
            }), 400
        
        # 生成工作流ID
        workflow_id = hashlib.md5(json.dumps(workflow, sort_keys=True).encode()).hexdigest()[:8]
        
        # 在实际应用中，这里应该保存到数据库
        logger.info(f"Workflow saved with ID: {workflow_id}")
        
        return jsonify({
            "success": True,
            "workflowId": workflow_id,
            "message": "Workflow saved successfully"
        })
    except Exception as e:
        logger.error(f"Error saving workflow: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "tools_available": len(TOOLS_REGISTRY)
    })

# ==================== 错误处理 ====================

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500

# ==================== 启动脚本 ====================

if __name__ == '__main__':
    print("🚀 Starting Tool Chain Editor Backend...")
    print(f"📋 Available tools: {list(TOOLS_REGISTRY.keys())}")
    print("🌐 Server will be available at: http://localhost:5000")
    print("📖 API Documentation:")
    print("  - GET  /api/tools - Get all tools")
    print("  - GET  /api/tools/<id> - Get specific tool")
    print("  - POST /api/tools/text-processor - Process text")
    print("  - POST /api/tools/sentiment-analyzer - Analyze sentiment")
    print("  - POST /api/tools/data-transformer - Transform data")
    print("  - POST /api/tools/file-processor - Process files")
    print("  - POST /api/workflows - Save workflow")
    print("  - GET  /api/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 