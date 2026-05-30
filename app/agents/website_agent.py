import json
from pathlib import Path

from app.core import settings
from app.core.events import event_bus
from app.core.llm import LocalLLM
from app.core.logger import Logger
from app.memory import long_term


class WebsiteAgent:

    def __init__(self) -> None:
        self.llm = LocalLLM()
        self.output_dir = Path(settings.GENERATED_SITES_DIR)
        self.template_dir = Path("app/templates/websites")

    async def execute(self, user_request: str) -> dict:
        await event_bus.emit_simple(
            "agent_started", agent="website",
            message=f"Processing: {user_request}",
        )

        intent = self._parse_intent(user_request)
        template = intent.get("template", "startup")
        project_name = intent.get("project_name", "my-website")

        Logger.step(f"Generating website: {project_name} (template: {template})")

        content = self._generate_content(user_request)

        project_dir = self.output_dir / project_name
        project_dir.mkdir(parents=True, exist_ok=True)

        html = self._build_html(template, content)
        index_file = project_dir / "index.html"
        index_file.write_text(html, encoding="utf-8")

        await event_bus.emit_simple(
            "file_created", agent="website",
            message=f"Created {index_file}",
            data={"file": str(index_file)},
        )

        await event_bus.emit_simple(
            "agent_completed", agent="website",
            message=f"Website generated at {project_dir}",
        )

        long_term.log_agent_action(
            agent="website", action="generate",
            input_data=user_request,
            output_data=str(project_dir),
        )

        return {
            "success": True,
            "response": f"Website '{project_name}' generated at {project_dir}.",
            "data": {"path": str(project_dir)},
        }

    def _parse_intent(self, user_request: str) -> dict:
        prompt = f"""Parse the website request.

User Request: {user_request}

Available templates: startup, saas, portfolio, landing_page

Return ONLY JSON:
{{"template": "startup", "project_name": "my-farming-site"}}"""

        try:
            response = self.llm.ask(prompt)
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {"template": "startup", "project_name": "my-website"}

    def _generate_content(self, user_request: str) -> dict:
        prompt = f"""Generate website content for: {user_request}

Return ONLY JSON with these fields:
{{"title": "...", "subtitle": "...", "description": "...", "features": ["...", "...", "..."], "cta_text": "..."}}"""

        try:
            response = self.llm.ask(prompt)
            return json.loads(response)
        except (json.JSONDecodeError, ValueError):
            return {
                "title": "Welcome",
                "subtitle": "Your next project",
                "description": "A modern website.",
                "features": ["Feature 1", "Feature 2", "Feature 3"],
                "cta_text": "Get Started",
            }

    def _build_html(self, template: str, content: dict) -> str:
        title = content.get("title", "My Website")
        subtitle = content.get("subtitle", "")
        description = content.get("description", "")
        features = content.get("features", [])
        cta = content.get("cta_text", "Get Started")

        features_html = "\n".join(
            f'        <div class="feature"><h3>{f}</h3></div>'
            for f in features
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: system-ui, sans-serif; color: #333; }}
        .hero {{ text-align: center; padding: 80px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }}
        .hero h1 {{ font-size: 3rem; margin-bottom: 1rem; }}
        .hero p {{ font-size: 1.2rem; opacity: 0.9; max-width: 600px; margin: 0 auto 2rem; }}
        .cta {{ display: inline-block; padding: 14px 32px; background: white; color: #667eea; border-radius: 8px; text-decoration: none; font-weight: 600; }}
        .features {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; padding: 60px 40px; max-width: 1200px; margin: 0 auto; }}
        .feature {{ padding: 24px; border: 1px solid #eee; border-radius: 12px; }}
        .feature h3 {{ margin-bottom: 8px; color: #667eea; }}
    </style>
</head>
<body>
    <section class="hero">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <p>{description}</p>
        <a href="#" class="cta">{cta}</a>
    </section>
    <section class="features">
{features_html}
    </section>
</body>
</html>"""
