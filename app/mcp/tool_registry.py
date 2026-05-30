"""
Tool Registry - Central registry for MCP tools
"""

import asyncio
import inspect
from typing import Any, Callable, Optional
from dataclasses import dataclass, field
from datetime import datetime

from app.core.logger import Logger


@dataclass
class ToolDefinition:
    """Definition of an MCP tool."""
    name: str
    description: str
    input_schema: dict
    handler: Callable
    category: str = "general"
    tags: list[str] = field(default_factory=list)
    enabled: bool = True
    version: str = "1.0.0"
    created_at: datetime = field(default_factory=datetime.now)
    
    def to_mcp_schema(self) -> dict:
        """Convert to MCP schema format."""
        return {
            "name": self.name,
            "description": self.description,
            "inputSchema": self.input_schema,
            "category": self.category,
            "tags": self.tags,
            "version": self.version,
        }


class ToolRegistry:
    """Central registry for all MCP tools."""
    
    _instance: Optional['ToolRegistry'] = None
    
    def __new__(cls) -> 'ToolRegistry':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self) -> None:
        if self._initialized:
            return
        
        self._tools: dict[str, ToolDefinition] = {}
        self._categories: dict[str, list[str]] = {}
        self._initialized = True
        Logger.info("Tool registry initialized")
    
    def register(self, tool: ToolDefinition) -> None:
        """Register a tool."""
        if not tool.enabled:
            Logger.warn(f"Skipping disabled tool: {tool.name}")
            return
        
        self._tools[tool.name] = tool
        
        # Add to category
        if tool.category not in self._categories:
            self._categories[tool.category] = []
        if tool.name not in self._categories[tool.category]:
            self._categories[tool.category].append(tool.name)
        
        Logger.info(f"Registered tool: {tool.name}")
    
    def unregister(self, name: str) -> bool:
        """Unregister a tool."""
        if name not in self._tools:
            return False
        
        tool = self._tools.pop(name)
        
        # Remove from category
        if tool.category in self._categories:
            self._categories[tool.category].remove(name)
        
        Logger.info(f"Unregistered tool: {name}")
        return True
    
    def get(self, name: str) -> Optional[ToolDefinition]:
        """Get a tool by name."""
        return self._tools.get(name)
    
    def get_all(self) -> list[ToolDefinition]:
        """Get all registered tools."""
        return list(self._tools.values())
    
    def get_by_category(self, category: str) -> list[ToolDefinition]:
        """Get all tools in a category."""
        tool_names = self._categories.get(category, [])
        return [self._tools[name] for name in tool_names if name in self._tools]
    
    def get_categories(self) -> list[str]:
        """Get all categories."""
        return list(self._categories.keys())
    
    async def execute(self, name: str, arguments: dict) -> Any:
        """Execute a tool by name."""
        tool = self.get(name)
        if not tool:
            raise ValueError(f"Tool not found: {name}")
        
        if not tool.enabled:
            raise ValueError(f"Tool is disabled: {name}")
        
        try:
            # Handle async handlers
            if asyncio.iscoroutinefunction(tool.handler):
                result = await tool.handler(**arguments)
            else:
                result = tool.handler(**arguments)
            
            Logger.info(f"Executed tool: {name}")
            return result
            
        except Exception as e:
            Logger.error(f"Tool execution error ({name}): {e}")
            raise
    
    def list_tools(self) -> list[dict]:
        """List all tools in MCP format."""
        return [tool.to_mcp_schema() for tool in self._tools.values() if tool.enabled]


# Decorator for easy tool registration
def tool(
    name: str,
    description: str,
    category: str = "general",
    tags: list[str] | None = None,
    input_schema: dict | None = None,
):
    """Decorator to register a function as an MCP tool."""
    
    def decorator(func: Callable) -> Callable:
        # Build input schema from function signature
        schema = input_schema
        if schema is None:
            sig = inspect.signature(func)
            properties = {}
            required = []
            
            for param_name, param in sig.parameters.items():
                if param_name in ('self', 'cls'):
                    continue
                
                # Infer type from annotation or default
                param_type = "string"
                if param.annotation != inspect.Parameter.empty:
                    if param.annotation in (int, 'int'):
                        param_type = "integer"
                    elif param.annotation in (float, 'float'):
                        param_type = "number"
                    elif param.annotation in (bool, 'bool'):
                        param_type = "boolean"
                    elif param.annotation in (list, 'list', tuple, 'array'):
                        param_type = "array"
                    elif param.annotation in (dict, 'dict', 'object'):
                        param_type = "object"
                
                properties[param_name] = {"type": param_type}
                
                if param.default == inspect.Parameter.empty:
                    required.append(param_name)
            
            schema = {
                "type": "object",
                "properties": properties,
                "required": required,
            }
        
        tool_def = ToolDefinition(
            name=name,
            description=description,
            input_schema=schema,
            handler=func,
            category=category,
            tags=tags or [],
        )
        
        # Register the tool
        registry = ToolRegistry()
        registry.register(tool_def)
        
        return func
    
    return decorator


# Create global registry instance
_registry = ToolRegistry()


# ── Built-in Tools ─────────────────────────────────────────────────────────────

@tool(
    name="get_time",
    description="Get the current date and time",
    category="system",
    tags=["time", "date", "system"],
)
def get_time() -> dict:
    """Get current date and time."""
    now = datetime.now()
    return {
        "datetime": now.isoformat(),
        "date": now.strftime("%Y-%m-%d"),
        "time": now.strftime("%H:%M:%S"),
        "timezone": "UTC",
        "weekday": now.strftime("%A"),
    }


@tool(
    name="search_web",
    description="Search the web for information",
    category="browser",
    tags=["search", "web", "information"],
    input_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query"},
            "limit": {"type": "integer", "description": "Max results", "default": 5},
        },
        "required": ["query"],
    },
)
async def search_web(query: str, limit: int = 5) -> dict:
    """Search the web."""
    # This would integrate with Tavily or similar search API
    return {
        "query": query,
        "results": [],
        "message": "Web search integration pending",
    }


@tool(
    name="read_file",
    description="Read contents of a file",
    category="file",
    tags=["file", "read", "filesystem"],
    input_schema={
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path"},
        },
        "required": ["path"],
    },
)
async def read_file(path: str) -> dict:
    """Read a file."""
    try:
        with open(path, 'r') as f:
            content = f.read()
        return {"success": True, "content": content, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}


@tool(
    name="write_file",
    description="Write content to a file",
    category="file",
    tags=["file", "write", "filesystem"],
    input_schema={
        "type": "object",
        "properties": {
            "path": {"type": "string", "description": "File path"},
            "content": {"type": "string", "description": "Content to write"},
        },
        "required": ["path", "content"],
    },
)
async def write_file(path: str, content: str) -> dict:
    """Write to a file."""
    try:
        with open(path, 'w') as f:
            f.write(content)
        return {"success": True, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}
