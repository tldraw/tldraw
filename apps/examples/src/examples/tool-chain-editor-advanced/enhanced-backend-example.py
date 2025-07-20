#!/usr/bin/env python3
"""
Enhanced Tool Chain Editor Backend
Backend example supporting toolset management and dynamic loading
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
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== Toolset Definitions ====================

# Toolset registry
TOOLSETS_REGISTRY = {
    "text-processing": {
        "id": "text-processing",
        "name": "Text Processing",
        "description": "Tools for text analysis, transformation, and processing",
        "category": "Text Analysis",
        "icon": "📝",
        "metadata": {
            "version": "1.0.0",
            "author": "System",
            "lastUpdated": datetime.now().isoformat(),
            "tags": ["text", "analysis", "processing"]
        },
        "tools": [
            {
                "id": "text-analyzer",
                "name": "Text Analyzer",
                "type": "process",
                "description": "Analyze text locally without API calls",
                "config": {
                    "parameters": {
                        "enable_sentiment": True,
                        "enable_keywords": True,
                        "max_keywords": 10,
                    },
                },
                "inputSchema": {
                    "text": {"type": "string", "required": True},
                },
                "outputSchema": {
                    "word_count": {"type": "number"},
                    "character_count": {"type": "number"},
                    "sentence_count": {"type": "number"},
                    "average_word_length": {"type": "number"},
                    "keywords": {"type": "array"},
                    "sentiment_score": {"type": "number"},
                },
            },
            {
                "id": "text-translator",
                "name": "Text Translator",
                "type": "agent",
                "description": "Translate text between different languages",
                "config": {
                    "apiEndpoint": "https://api.translate.com/v1/translate",
                    "apiKey": "your-translation-api-key",
                    "parameters": {
                        "source_lang": "en",
                        "target_lang": "zh",
                    },
                    "headers": {
                        "Content-Type": "application/json",
                    },
                },
                "inputSchema": {
                    "text": {"type": "string", "required": True},
                    "target_language": {"type": "string", "required": False},
                },
                "outputSchema": {
                    "translated_text": {"type": "string"},
                    "source_language": {"type": "string"},
                    "target_language": {"type": "string"},
                },
            }
        ]
    },
    
    "data-processing": {
        "id": "data-processing",
        "name": "Data Processing",
        "description": "Tools for data transformation, validation, and analysis",
        "category": "Data Analysis",
        "icon": "📊",
        "metadata": {
            "version": "1.0.0",
            "author": "System",
            "lastUpdated": datetime.now().isoformat(),
            "tags": ["data", "processing", "transformation"]
        },
        "tools": [
            {
                "id": "json-formatter",
                "name": "JSON Formatter",
                "type": "process",
                "description": "Format and validate JSON data",
                "config": {
                    "parameters": {
                        "indent_size": 2,
                        "sort_keys": True,
                    },
                },
                "inputSchema": {
                    "json_data": {"type": "string", "required": True},
                },
                "outputSchema": {
                    "formatted_json": {"type": "string"},
                    "is_valid": {"type": "boolean"},
                    "error_message": {"type": "string"},
                },
            },
            {
                "id": "data-transformer",
                "name": "Data Transformer",
                "type": "process",
                "description": "Transform data between different formats",
                "config": {
                    "parameters": {
                        "outputFormat": "json",
                        "includeMetadata": True
                    },
                },
                "inputSchema": {
                    "data": {"type": "object", "required": True},
                    "transformType": {"type": "string", "required": False}
                },
                "outputSchema": {
                    "transformedData": {"type": "object"},
                    "metadata": {"type": "object"}
                },
            }
        ]
    },
    
    "ai-ml": {
        "id": "ai-ml",
        "name": "AI & Machine Learning",
        "description": "AI-powered tools for content generation and analysis",
        "category": "Artificial Intelligence",
        "icon": "🤖",
        "metadata": {
            "version": "1.0.0",
            "author": "System",
            "lastUpdated": datetime.now().isoformat(),
            "tags": ["ai", "ml", "generation"]
        },
        "tools": [
            {
                "id": "deepseek-agent",
                "name": "DeepSeek AI Agent",
                "type": "agent",
                "description": "AI-powered content generation using DeepSeek API",
                "config": {
                    "apiEndpoint": "https://api.deepseek.com/v1/chat/completions",
                    "apiKey": "sk-26d1dcdacd4148b0a27b724af6f8daf7",
                    "parameters": {
                        "model": "deepseek-chat",
                        "max_tokens": 256,
                        "temperature": 0.7,
                    },
                    "headers": {
                        "Content-Type": "application/json",
                    },
                },
                "inputSchema": {
                    "question": {"type": "string", "required": True},
                },
                "outputSchema": {
                    "response": {"type": "string"},
                },
            },
            {
                "id": "sentiment-analyzer",
                "name": "Sentiment Analyzer",
                "type": "process",
                "description": "Analyze text sentiment using local processing",
                "config": {
                    "parameters": {
                        "algorithm": "keyword-based",
                        "threshold": 0.5
                    },
                },
                "inputSchema": {
                    "text": {"type": "string", "required": True},
                },
                "outputSchema": {
                    "sentiment": {"type": "string"},
                    "score": {"type": "number"},
                    "confidence": {"type": "number"},
                },
            }
        ]
    },
    
    "file-processing": {
        "id": "file-processing",
        "name": "File Processing",
        "description": "Tools for file handling, compression, and conversion",
        "category": "File Management",
        "icon": "📁",
        "metadata": {
            "version": "1.0.0",
            "author": "System",
            "lastUpdated": datetime.now().isoformat(),
            "tags": ["file", "processing", "compression"]
        },
        "tools": [
            {
                "id": "image-compressor",
                "name": "Image Compressor",
                "type": "process",
                "description": "Compress images using local processing",
                "config": {
                    "parameters": {
                        "quality": 0.8,
                        "max_width": 1920,
                        "max_height": 1080,
                        "format": "jpeg",
                    },
                },
                "inputSchema": {
                    "image_data": {"type": "string", "required": True},
                    "filename": {"type": "string", "required": True},
                },
                "outputSchema": {
                    "compressed_image": {"type": "string"},
                    "original_size": {"type": "number"},
                    "compressed_size": {"type": "number"},
                    "compression_ratio": {"type": "number"},
                },
            },
            {
                "id": "file-processor",
                "name": "File Processor",
                "type": "process",
                "description": "Process files (text, images, etc.)",
                "config": {
                    "parameters": {
                        "maxFileSize": 10485760,
                        "allowedTypes": ["txt", "json", "csv"]
                    },
                },
                "inputSchema": {
                    "fileContent": {"type": "string", "required": True},
                    "fileType": {"type": "string", "required": True}
                },
                "outputSchema": {
                    "processedContent": {"type": "string"},
                    "fileInfo": {"type": "object"},
                    "statistics": {"type": "object"}
                },
            }
        ]
    }
}

# ==================== Tool Processor ====================

class EnhancedToolProcessor:
    """Enhanced Tool Processor"""
    
    @staticmethod
    def process_text_analyzer(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Text Analyzer"""
        text = input_data.get("text", "")
        enable_sentiment = input_data.get("enable_sentiment", True)
        enable_keywords = input_data.get("enable_keywords", True)
        max_keywords = input_data.get("max_keywords", 10)
        
        # Basic text statistics
        words = text.split()
        sentences = re.split(r'[.!?]+', text)
        characters = len(text.replace(" ", ""))
        
        result = {
            "word_count": len(words),
            "character_count": characters,
            "sentence_count": len([s for s in sentences if s.strip()]),
            "average_word_length": sum(len(word) for word in words) / len(words) if words else 0,
        }
        
        # Keyword extraction
        if enable_keywords:
            word_freq = {}
            for word in words:
                clean_word = re.sub(r'[^\w]', '', word.lower())
                if len(clean_word) > 2:
                    word_freq[clean_word] = word_freq.get(clean_word, 0) + 1
            
            result["keywords"] = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:max_keywords]
        
        # Sentiment analysis
        if enable_sentiment:
            positive_words = {"good", "great", "excellent", "amazing", "wonderful", "love", "like"}
            negative_words = {"bad", "terrible", "awful", "hate", "dislike", "horrible"}
            
            positive_count = sum(1 for word in words if word.lower() in positive_words)
            negative_count = sum(1 for word in words if word.lower() in negative_words)
            
            result["sentiment_score"] = positive_count - negative_count
        
        return result
    
    @staticmethod
    def process_json_formatter(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """JSON Formatter"""
        json_data = input_data.get("json_data", "")
        indent_size = input_data.get("indent_size", 2)
        sort_keys = input_data.get("sort_keys", True)
        
        try:
            parsed = json.loads(json_data)
            if sort_keys:
                formatted_json = json.dumps(parsed, indent=indent_size, sort_keys=True)
            else:
                formatted_json = json.dumps(parsed, indent=indent_size)
            
            return {
                "formatted_json": formatted_json,
                "is_valid": True,
                "error_message": ""
            }
        except json.JSONDecodeError as e:
            return {
                "formatted_json": "",
                "is_valid": False,
                "error_message": str(e)
            }
    
    @staticmethod
    def process_sentiment_analyzer(input_data: Dict[str, Any]) -> Dict[str, Any]:
        """Sentiment Analyzer"""
        text = input_data.get("text", "").lower()
        algorithm = input_data.get("algorithm", "keyword-based")
        threshold = input_data.get("threshold", 0.5)
        
        # Simple sentiment analysis
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
        """Data Transformer"""
        data = input_data.get("data", {})
        transform_type = input_data.get("transformType", "format")
        output_format = input_data.get("outputFormat", "json")
        include_metadata = input_data.get("includeMetadata", True)
        
        transformed_data = data.copy()
        metadata = {}
        
        if transform_type == "format":
            if output_format == "json":
                transformed_data = json.dumps(data, indent=2, ensure_ascii=False)
            elif output_format == "compact":
                transformed_data = json.dumps(data, separators=(',', ':'))
        
        elif transform_type == "normalize":
            if isinstance(data, dict):
                transformed_data = {k.lower().replace(" ", "_"): v for k, v in data.items()}
        
        elif transform_type == "validate":
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
        """File Processor"""
        file_content = input_data.get("fileContent", "")
        file_type = input_data.get("fileType", "txt")
        max_file_size = input_data.get("maxFileSize", 10485760)
        
        # File info
        file_info = {
            "type": file_type,
            "size": len(file_content),
            "lines": len(file_content.splitlines()),
            "words": len(file_content.split()),
            "characters": len(file_content),
            "processedAt": datetime.now().isoformat()
        }
        
        # Check file size
        if len(file_content) > max_file_size:
            return {
                "error": f"File too large. Maximum size: {max_file_size} bytes",
                "fileInfo": file_info
            }
        
        # Process according to file type
        processed_content = file_content
        statistics = {}
        
        if file_type == "txt":
            processed_content = file_content.strip()
            statistics = {
                "paragraphs": len([p for p in file_content.split('\n\n') if p.strip()]),
                "averageLineLength": sum(len(line) for line in file_content.splitlines()) / len(file_content.splitlines()) if file_content.splitlines() else 0
            }
        
        elif file_type == "json":
            try:
                parsed_json = json.loads(file_content)
                processed_content = json.dumps(parsed_json, indent=2, ensure_ascii=False)
                statistics = {
                    "isValidJson": True,
                    "jsonDepth": EnhancedToolProcessor._calculate_json_depth(parsed_json),
                    "jsonKeys": EnhancedToolProcessor._count_json_keys(parsed_json)
                }
            except json.JSONDecodeError as e:
                processed_content = f"Invalid JSON: {str(e)}"
                statistics = {"isValidJson": False, "error": str(e)}
        
        elif file_type == "csv":
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
        """Calculate the depth of a JSON object"""
        if isinstance(obj, dict):
            if not obj:
                return current_depth
            return max(EnhancedToolProcessor._calculate_json_depth(v, current_depth + 1) for v in obj.values())
        elif isinstance(obj, list):
            if not obj:
                return current_depth
            return max(EnhancedToolProcessor._calculate_json_depth(item, current_depth + 1) for item in obj)
        else:
            return current_depth
    
    @staticmethod
    def _count_json_keys(obj):
        """Count the number of keys in a JSON object"""
        if isinstance(obj, dict):
            return len(obj) + sum(EnhancedToolProcessor._count_json_keys(v) for v in obj.values())
        elif isinstance(obj, list):
            return sum(EnhancedToolProcessor._count_json_keys(item) for item in obj)
        else:
            return 0

# ==================== API Routes ====================

@app.route('/api/toolsets', methods=['GET'])
def get_toolsets():
    """Get all toolsets"""
    try:
        toolsets_list = list(TOOLSETS_REGISTRY.values())
        return jsonify({
            "success": True,
            "toolsets": toolsets_list,
            "count": len(toolsets_list)
        })
    except Exception as e:
        logger.error(f"Error getting toolsets: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/toolsets/<toolset_id>', methods=['GET'])
def get_toolset(toolset_id):
    """Get a specific toolset"""
    try:
        if toolset_id not in TOOLSETS_REGISTRY:
            return jsonify({
                "success": False,
                "error": f"Toolset {toolset_id} not found"
            }), 404
        
        return jsonify({
            "success": True,
            "toolset": TOOLSETS_REGISTRY[toolset_id]
        })
    except Exception as e:
        logger.error(f"Error getting toolset {toolset_id}: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/toolsets/batch', methods=['POST'])
def get_toolsets_batch():
    """Get multiple toolsets in batch"""
    try:
        data = request.get_json()
        toolset_ids = data.get("toolSetIds", [])
        
        toolsets = []
        for toolset_id in toolset_ids:
            if toolset_id in TOOLSETS_REGISTRY:
                toolsets.append(TOOLSETS_REGISTRY[toolset_id])
        
        return jsonify({
            "success": True,
            "toolsets": toolsets,
            "count": len(toolsets)
        })
    except Exception as e:
        logger.error(f"Error getting toolsets batch: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/toolsets/categories', methods=['GET'])
def get_toolset_categories():
    """Get all toolset categories"""
    try:
        categories = set(toolset["category"] for toolset in TOOLSETS_REGISTRY.values())
        return jsonify({
            "success": True,
            "categories": list(categories)
        })
    except Exception as e:
        logger.error(f"Error getting toolset categories: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/toolsets/category/<category>', methods=['GET'])
def get_toolsets_by_category(category):
    """Get toolsets by category"""
    try:
        toolsets = [
            toolset for toolset in TOOLSETS_REGISTRY.values() 
            if toolset["category"] == category
        ]
        return jsonify({
            "success": True,
            "toolsets": toolsets,
            "count": len(toolsets)
        })
    except Exception as e:
        logger.error(f"Error getting toolsets by category {category}: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# Tool execution APIs
@app.route('/api/tools/text-analyzer', methods=['POST'])
def text_analyzer():
    """Text Analyzer API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = EnhancedToolProcessor.process_text_analyzer(data)
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error in text analyzer: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tools/json-formatter', methods=['POST'])
def json_formatter():
    """JSON Formatter API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = EnhancedToolProcessor.process_json_formatter(data)
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as e:
        logger.error(f"Error in JSON formatter: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/tools/sentiment-analyzer', methods=['POST'])
def sentiment_analyzer():
    """Sentiment Analyzer API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = EnhancedToolProcessor.process_sentiment_analyzer(data)
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
    """Data Transformer API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = EnhancedToolProcessor.process_data_transformer(data)
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
    """File Processor API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        result = EnhancedToolProcessor.process_file_processor(data)
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

@app.route('/api/tools/deepseek-agent', methods=['POST'])
def deepseek_agent():
    """DeepSeek AI Agent API"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        # Accept both 'question' and 'text' fields for flexibility
        question = data.get('question', '') or data.get('text', '')
        if not question:
            return jsonify({
                "success": False,
                "error": "Question or text is required"
            }), 400
        
        logger.info(f"DeepSeek agent received question: {question}")
        
        # Real DeepSeek API call using urllib
        import urllib.request
        import urllib.parse
        import urllib.error
        import json
        
        api_key = "sk-26d1dcdacd4148b0a27b724af6f8daf7"
        api_url = "https://api.deepseek.com/v1/chat/completions"
        
        payload = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "user",
                    "content": question
                }
            ],
            "max_tokens": 256,
            "temperature": 0.7
        }
        
        logger.info(f"Calling DeepSeek API with payload: {payload}")
        
        # Prepare the request
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(api_url, data=data)
        req.add_header('Content-Type', 'application/json')
        req.add_header('Authorization', f'Bearer {api_key}')
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                response_data = response.read()
                deepseek_response = json.loads(response_data.decode('utf-8'))
                logger.info(f"DeepSeek API response: {deepseek_response}")
                
                # Extract the response content
                if deepseek_response.get('choices') and len(deepseek_response['choices']) > 0:
                    ai_response = deepseek_response['choices'][0]['message']['content']
                else:
                    ai_response = "No response from DeepSeek API"
                
                result = {
                    "success": True,
                    "result": {
                        "response": ai_response,
                        "model": deepseek_response.get('model', 'deepseek-chat'),
                        "usage": deepseek_response.get('usage', {}),
                        "timestamp": datetime.now().isoformat()
                    }
                }
        except urllib.error.HTTPError as e:
            error_data = e.read().decode('utf-8')
            logger.error(f"DeepSeek API error: {e.code} - {error_data}")
            result = {
                "success": False,
                "error": f"DeepSeek API error: {e.code} - {error_data}"
            }
        except Exception as e:
            logger.error(f"Network error: {e}")
            result = {
                "success": False,
                "error": f"Network error: {str(e)}"
            }
        
        logger.info(f"DeepSeek agent final response: {result}")
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in DeepSeek agent: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/parse-toolchain', methods=['POST'])
def parse_toolchain():
    """Parse chatbot input to generate tool chain"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({
                "success": False,
                "error": "No data provided"
            }), 400
        
        user_input = data.get('input', '')
        if not user_input:
            return jsonify({
                "success": False,
                "error": "Input text is required"
            }), 400
        
        # Enhanced prompt for tool chain parsing
        enhanced_prompt = f"""
You are an AI assistant that analyzes user input and generates tool chain configurations for a visual workflow editor.

Available toolsets and tools:
{json.dumps(TOOLSETS_REGISTRY, indent=2, default=str)}

User Input: "{user_input}"

Please analyze the user's request and generate a tool chain configuration that includes:
1. The sequence of tools needed
2. The connections between tools
3. Any specific parameters or configurations

Return your response as a JSON object with the following structure:
{{
    "nodes": [
        {{
            "id": "node_id",
            "type": "inputNode|agentNode|processNode|outputNode",
            "position": {{"x": 100, "y": 100}},
            "data": {{
                "tool": {{"id": "tool_id", "name": "Tool Name"}},
                "value": "input_value_if_applicable"
            }}
        }}
    ],
    "edges": [
        {{
            "id": "edge_id",
            "source": "source_node_id",
            "target": "target_node_id"
        }}
    ],
    "description": "Brief description of the generated workflow"
}}

Focus on creating logical workflows that process data through multiple steps. Use appropriate tools from the available toolsets.
"""
        
        # Simulate AI processing with enhanced prompt
        import time
        time.sleep(2)  # Simulate processing time
        
        # Generate a sample tool chain based on common patterns
        tool_chain = generate_sample_toolchain(user_input)
        
        return jsonify({
            "success": True,
            "result": {
                "toolchain": tool_chain,
                "prompt_used": enhanced_prompt,
                "timestamp": datetime.now().isoformat()
            }
        })
    except Exception as e:
        logger.error(f"Error parsing toolchain: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

def generate_sample_toolchain(user_input: str) -> dict:
    """Generate a sample tool chain based on user input"""
    input_lower = user_input.lower()
    
    # Common patterns for tool chain generation
    if any(word in input_lower for word in ['analyze', 'text', 'sentiment']):
        return {
            "nodes": [
                {
                    "id": "input-1",
                    "type": "inputNode",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "value": "Enter text to analyze..."
                    }
                },
                {
                    "id": "text-analyzer-1",
                    "type": "processNode",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "tool": {"id": "text-analyzer", "name": "Text Analyzer"}
                    }
                },
                {
                    "id": "sentiment-1",
                    "type": "processNode",
                    "position": {"x": 500, "y": 100},
                    "data": {
                        "tool": {"id": "sentiment-analyzer", "name": "Sentiment Analyzer"}
                    }
                },
                {
                    "id": "output-1",
                    "type": "outputNode",
                    "position": {"x": 700, "y": 100},
                    "data": {}
                }
            ],
            "edges": [
                {"id": "e1", "source": "input-1", "target": "text-analyzer-1"},
                {"id": "e2", "source": "text-analyzer-1", "target": "sentiment-1"},
                {"id": "e3", "source": "sentiment-1", "target": "output-1"}
            ],
            "description": "Text analysis and sentiment detection workflow"
        }
    elif any(word in input_lower for word in ['translate', 'language']):
        return {
            "nodes": [
                {
                    "id": "input-1",
                    "type": "inputNode",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "value": "Enter text to translate..."
                    }
                },
                {
                    "id": "translator-1",
                    "type": "agentNode",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "tool": {"id": "text-translator", "name": "Text Translator"}
                    }
                },
                {
                    "id": "output-1",
                    "type": "outputNode",
                    "position": {"x": 500, "y": 100},
                    "data": {}
                }
            ],
            "edges": [
                {"id": "e1", "source": "input-1", "target": "translator-1"},
                {"id": "e2", "source": "translator-1", "target": "output-1"}
            ],
            "description": "Text translation workflow"
        }
    elif any(word in input_lower for word in ['json', 'format', 'data']):
        return {
            "nodes": [
                {
                    "id": "input-1",
                    "type": "inputNode",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "value": "Enter JSON data..."
                    }
                },
                {
                    "id": "formatter-1",
                    "type": "processNode",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "tool": {"id": "json-formatter", "name": "JSON Formatter"}
                    }
                },
                {
                    "id": "transformer-1",
                    "type": "processNode",
                    "position": {"x": 500, "y": 100},
                    "data": {
                        "tool": {"id": "data-transformer", "name": "Data Transformer"}
                    }
                },
                {
                    "id": "output-1",
                    "type": "outputNode",
                    "position": {"x": 700, "y": 100},
                    "data": {}
                }
            ],
            "edges": [
                {"id": "e1", "source": "input-1", "target": "formatter-1"},
                {"id": "e2", "source": "formatter-1", "target": "transformer-1"},
                {"id": "e3", "source": "transformer-1", "target": "output-1"}
            ],
            "description": "JSON formatting and data transformation workflow"
        }
    else:
        # Default workflow with AI agent
        return {
            "nodes": [
                {
                    "id": "input-1",
                    "type": "inputNode",
                    "position": {"x": 100, "y": 100},
                    "data": {
                        "value": "Enter your question..."
                    }
                },
                {
                    "id": "ai-agent-1",
                    "type": "agentNode",
                    "position": {"x": 300, "y": 100},
                    "data": {
                        "tool": {"id": "deepseek-agent", "name": "DeepSeek AI Agent"}
                    }
                },
                {
                    "id": "output-1",
                    "type": "outputNode",
                    "position": {"x": 500, "y": 100},
                    "data": {}
                }
            ],
            "edges": [
                {"id": "e1", "source": "input-1", "target": "ai-agent-1"},
                {"id": "e2", "source": "ai-agent-1", "target": "output-1"}
            ],
            "description": "AI-powered workflow with DeepSeek agent"
        }

# Workflow management API
@app.route('/api/workflows', methods=['POST'])
def save_workflow():
    """Save workflow"""
    try:
        workflow = request.get_json()
        if not workflow:
            return jsonify({
                "success": False,
                "error": "No workflow data provided"
            }), 400
        
        # Generate workflow ID
        workflow_id = hashlib.md5(json.dumps(workflow, sort_keys=True).encode()).hexdigest()[:8]
        
        # In a real application, this should be saved to a database
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

@app.route('/', methods=['GET'])
def root():
    """Root endpoint"""
    return jsonify({
        "message": "Enhanced Tool Chain Editor Backend",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "available_endpoints": [
            "/api/health",
            "/api/toolsets",
            "/api/parse-toolchain",
            "/api/workflows"
        ]
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "toolsets_available": len(TOOLSETS_REGISTRY),
        "total_tools": sum(len(toolset["tools"]) for toolset in TOOLSETS_REGISTRY.values())
    })

# ==================== Error Handlers ====================

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

# ==================== Startup Script ====================

if __name__ == '__main__':
    print("🚀 Starting Enhanced Tool Chain Editor Backend...")
    print(f"📋 Available toolsets: {list(TOOLSETS_REGISTRY.keys())}")
    print("🌐 Server will be available at: http://localhost:5000")
    print("📖 API Documentation:")
    print("  - GET  /api/toolsets - Get all toolsets")
    print("  - GET  /api/toolsets/<id> - Get specific toolset")
    print("  - POST /api/toolsets/batch - Get multiple toolsets")
    print("  - GET  /api/toolsets/categories - Get all categories")
    print("  - GET  /api/toolsets/category/<category> - Get toolsets by category")
    print("  - POST /api/tools/text-analyzer - Process text analysis")
    print("  - POST /api/tools/json-formatter - Format JSON")
    print("  - POST /api/tools/sentiment-analyzer - Analyze sentiment")
    print("  - POST /api/tools/data-transformer - Transform data")
    print("  - POST /api/tools/file-processor - Process files")
    print("  - POST /api/tools/deepseek-agent - DeepSeek AI Agent")
    print("  - POST /api/parse-toolchain - Parse chatbot input to tool chain")
    print("  - POST /api/workflows - Save workflow")
    print("  - GET  /api/health - Health check")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 