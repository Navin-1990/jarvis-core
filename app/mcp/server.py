"""
MCP Server - HTTP/WebSocket server for MCP protocol
"""

import asyncio
import json
from typing import Any, Optional
from dataclasses import dataclass

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.core.logger import Logger
from app.mcp.tool_registry import ToolRegistry


@dataclass
class MCPRequest:
    """Represents an MCP request."""
    jsonrpc: str = "2.0"
    method: str = ""
    params: dict = None
    id: Any = None


class MCPServer:
    """MCP Server that exposes tools via HTTP and WebSocket."""
    
    def __init__(self) -> None:
        self._app = FastAPI(title="JARVIS MCP Server")
        self._registry = ToolRegistry()
        self._setup_routes()
    
    def _setup_routes(self) -> None:
        """Set up MCP routes."""
        # Add CORS middleware
        self._app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        @self._app.get("/")
        async def root():
            return {
                "name": "JARVIS MCP Server",
                "version": "1.0.0",
                "status": "online",
            }
        
        @self._app.get("/tools")
        async def list_tools():
            """List all available MCP tools."""
            return {
                "tools": self._registry.list_tools(),
                "categories": self._registry.get_categories(),
            }
        
        @self._app.get("/tools/{category}")
        async def list_tools_by_category(category: str):
            """List tools in a specific category."""
            tools = self._registry.get_by_category(category)
            return {
                "category": category,
                "tools": [t.to_mcp_schema() for t in tools],
            }
        
        @self._app.post("/tools/{tool_name}")
        async def execute_tool(tool_name: str, params: dict = None):
            """Execute a specific tool."""
            if params is None:
                params = {}
            
            try:
                result = await self._registry.execute(tool_name, params)
                return {"success": True, "result": result}
            except ValueError as e:
                raise HTTPException(status_code=404, detail=str(e))
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self._app.get("/health")
        async def health():
            """Health check endpoint."""
            return {"status": "healthy", "server": "mcp"}
        
        # WebSocket endpoint for streaming responses
        @self._app.websocket("/ws")
        async def websocket_endpoint(websocket: WebSocket):
            """WebSocket endpoint for MCP requests."""
            await websocket.accept()
            Logger.info("MCP WebSocket connected")
            
            try:
                while True:
                    # Receive request
                    data = await websocket.receive_text()
                    
                    try:
                        request = json.loads(data)
                        method = request.get("method", "")
                        params = request.get("params", {})
                        request_id = request.get("id")
                        
                        # Handle different MCP methods
                        if method == "tools/list":
                            response = {
                                "jsonrpc": "2.0",
                                "id": request_id,
                                "result": self._registry.list_tools(),
                            }
                        
                        elif method == "tools/execute":
                            tool_name = params.get("name")
                            tool_params = params.get("params", {})
                            
                            try:
                                result = await self._registry.execute(tool_name, tool_params)
                                response = {
                                    "jsonrpc": "2.0",
                                    "id": request_id,
                                    "result": result,
                                }
                            except Exception as e:
                                response = {
                                    "jsonrpc": "2.0",
                                    "id": request_id,
                                    "error": {
                                        "code": -32603,
                                        "message": str(e),
                                    },
                                }
                        
                        elif method == "tools/categories":
                            response = {
                                "jsonrpc": "2.0",
                                "id": request_id,
                                "result": self._registry.get_categories(),
                            }
                        
                        else:
                            response = {
                                "jsonrpc": "2.0",
                                "id": request_id,
                                "error": {
                                    "code": -32601,
                                    "message": f"Method not found: {method}",
                                },
                            }
                        
                        # Send response
                        await websocket.send_text(json.dumps(response))
                        
                    except json.JSONDecodeError:
                        await websocket.send_text(json.dumps({
                            "jsonrpc": "2.0",
                            "id": None,
                            "error": {
                                "code": -32700,
                                "message": "Parse error",
                            },
                        }))
                        
            except WebSocketDisconnect:
                Logger.info("MCP WebSocket disconnected")
            except Exception as e:
                Logger.error(f"MCP WebSocket error: {e}")
    
    @property
    def app(self) -> FastAPI:
        """Get the FastAPI app."""
        return self._app


# Create singleton instance
_mcp_server = MCPServer()


def get_mcp_server() -> MCPServer:
    """Get the MCP server instance."""
    return _mcp_server
