"""
MCP (Model Context Protocol) Integration for JARVIS

Exposes tools through MCP for consumption by agents and external systems.
"""

from app.mcp.server import MCPServer
from app.mcp.tool_registry import ToolRegistry, tool

__all__ = ["MCPServer", "ToolRegistry", "tool"]
