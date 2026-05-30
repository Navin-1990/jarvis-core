import json
import subprocess
from pathlib import Path

from app.core import settings
from app.core.events import event_bus
from app.core.llm import LocalLLM
from app.core.logger import Logger
from app.memory import long_term


MAX_FIX_ITERATIONS = 3


class CodingAgent:

    def __init__(self) -> None:
        self.llm = LocalLLM()
        self.output_dir = Path(settings.GENERATED_SITES_DIR).parent / "generated_code"

    async def execute(self, user_request: str) -> dict:
        await event_bus.emit_simple(
            "agent_started", agent="coding",
            message=f"Processing coding request: {user_request}",
        )

        intent = self._parse_intent(user_request)
        action = intent.get("action", "generate")

        if action == "generate":
            result = await self._generate_and_test(user_request, intent)
        elif action == "review":
            result = await self._review_code(user_request, intent)
        elif action == "explain":
            result = await self._explain_code(user_request, intent)
        else:
            result = await self._generate_and_test(user_request, intent)

        await event_bus.emit_simple(
            "agent_completed", agent="coding",
            message=result.get("response", ""),
            data={"success": result.get("success", False)},
        )

        long_term.log_agent_action(
            agent="coding", action=action,
            input_data=user_request,
            output_data=result.get("response", ""),
            success=result.get("success", True),
        )

        return result

    def _parse_intent(self, user_request: str) -> dict:
        prompt = f"""You are Jarvis Coding Agent. Parse the coding request.

User Request: {user_request}

Available actions:
- generate: Generate new code (extract language, project_name, description)
- review: Review existing code (extract file_path)
- explain: Explain code (extract file_path or code snippet)

Return ONLY JSON.
Example:
{{"action": "generate", "language": "python", "project_name": "calculator", "description": "A simple calculator"}}"""

        try:
            response = self.llm.ask(prompt)
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {"action": "generate", "language": "python", "description": user_request}

    async def _generate_and_test(self, user_request: str, intent: dict) -> dict:
        language = intent.get("language", "python")
        project_name = intent.get("project_name", "jarvis_project")
        description = intent.get("description", user_request)

        Logger.step(f"Generating {language} code: {project_name}")
        await event_bus.emit_simple(
            "code_generating", agent="coding",
            message=f"Generating {language} code...",
        )

        code = self._generate_code(description, language)

        project_dir = self.output_dir / project_name
        project_dir.mkdir(parents=True, exist_ok=True)

        ext = {"python": ".py", "javascript": ".js", "typescript": ".ts",
               "java": ".java", "csharp": ".cs", "go": ".go", "rust": ".rs",
               }.get(language, ".py")
        main_file = project_dir / f"main{ext}"
        main_file.write_text(code, encoding="utf-8")

        await event_bus.emit_simple(
            "file_created", agent="coding",
            message=f"Created {main_file}",
            data={"file": str(main_file)},
        )

        if language == "python":
            result = await self._test_and_fix_python(code, main_file)
        else:
            result = {
                "success": True,
                "code": code,
                "output": "",
                "errors": [],
                "iterations": 0,
                "response": f"Code generated and saved to {main_file}. (Auto-test only available for Python.)",
            }

        result["file"] = str(main_file)
        return result

    def _generate_code(self, description: str, language: str) -> str:
        prompt = f"""Generate {language} code for the following:

{description}

Requirements:
- Production quality
- Include error handling
- Include comments
- Make it complete and runnable

Return ONLY the code. No markdown fences. No explanation."""

        return self.llm.ask(prompt)

    async def _test_and_fix_python(self, code: str, file_path: Path) -> dict:
        errors_history: list[str] = []

        for iteration in range(MAX_FIX_ITERATIONS + 1):
            Logger.step(f"Testing code (iteration {iteration})")
            await event_bus.emit_simple(
                "code_testing", agent="coding",
                message=f"Testing iteration {iteration}...",
                data={"iteration": iteration},
            )

            success, output = self._run_python(file_path)

            if success:
                Logger.success(f"Code runs successfully after {iteration} iteration(s)")
                return {
                    "success": True,
                    "code": file_path.read_text(encoding="utf-8"),
                    "output": output,
                    "errors": errors_history,
                    "iterations": iteration,
                    "response": f"Code generated and tested successfully in {iteration} iteration(s).\nOutput:\n{output}",
                }

            errors_history.append(output)
            Logger.error(f"Error on iteration {iteration}: {output[:200]}")

            if iteration < MAX_FIX_ITERATIONS:
                await event_bus.emit_simple(
                    "code_fixing", agent="coding",
                    message=f"Fixing error (attempt {iteration + 1})...",
                )
                code = self._fix_code(code, output)
                file_path.write_text(code, encoding="utf-8")

        return {
            "success": False,
            "code": code,
            "output": output,
            "errors": errors_history,
            "iterations": MAX_FIX_ITERATIONS,
            "response": f"Code could not be fixed after {MAX_FIX_ITERATIONS} attempts.\nLast error:\n{output}",
        }

    def _run_python(self, file_path: Path) -> tuple[bool, str]:
        try:
            result = subprocess.run(
                ["python", str(file_path)],
                capture_output=True, text=True, timeout=30,
                cwd=file_path.parent,
            )
            if result.returncode == 0:
                return True, result.stdout
            return False, result.stderr
        except subprocess.TimeoutExpired:
            return False, "Execution timed out (30s limit)"
        except Exception as e:
            return False, str(e)

    def _fix_code(self, code: str, error: str) -> str:
        prompt = f"""Fix the following Python code that has an error.

Current code:
{code}

Error:
{error}

Return ONLY the fixed code. No markdown fences. No explanation."""

        return self.llm.ask(prompt)

    async def _review_code(self, user_request: str, intent: dict) -> dict:
        file_path = intent.get("file_path", "")
        if file_path and Path(file_path).exists():
            code = Path(file_path).read_text(encoding="utf-8")
        else:
            code = user_request

        review = self.llm.ask(
            f"""Review this code and provide feedback on:
1. Code quality
2. Potential bugs
3. Performance
4. Security concerns
5. Suggestions for improvement

Code:
{code}

Provide a concise review."""
        )

        return {"success": True, "response": review}

    async def _explain_code(self, user_request: str, intent: dict) -> dict:
        file_path = intent.get("file_path", "")
        if file_path and Path(file_path).exists():
            code = Path(file_path).read_text(encoding="utf-8")
        else:
            code = user_request

        explanation = self.llm.ask(
            f"""Explain this code in simple terms:

{code}

Explain what it does, how it works, and any important concepts."""
        )

        return {"success": True, "response": explanation}
