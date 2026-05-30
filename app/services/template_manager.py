from pathlib import Path


TEMPLATES_ROOT = Path(__file__).resolve().parent.parent / "templates" / "websites"


class TemplateManager:

    def get_website_template(self, template_name):

        safe_name = Path(template_name).name
        template_path = (TEMPLATES_ROOT / safe_name).resolve()

        if not str(template_path).startswith(str(TEMPLATES_ROOT)):
            raise ValueError("Invalid template name")

        if not template_path.is_dir():
            raise FileNotFoundError(f"Template '{safe_name}' not found")

        return {
            "index": (template_path / "index.html").read_text(encoding="utf-8"),
            "style": (template_path / "style.css").read_text(encoding="utf-8"),
            "script": (template_path / "script.js").read_text(encoding="utf-8")
        }
