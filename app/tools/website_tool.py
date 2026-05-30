from pathlib import Path

from app.core import settings
from app.core.llm import LocalLLM
from app.core.logger import Logger


class WebsiteTool:

    def __init__(self):

        self.llm = LocalLLM()

    def create_website(self, description):

        Logger.step("Creating project folder")

        project_folder = Path(settings.GENERATED_SITES_DIR) / "JarvisWebsite"

        project_folder.mkdir(
            parents=True,
            exist_ok=True
        )

        Logger.success(project_folder)

        # --------------------------------------------------
        # PLAN
        # --------------------------------------------------

        Logger.step("Generating website plan")

        plan = self.llm.ask(
            f"""
You are a website architect.

Website Description:

{description}

Return ONLY JSON.

Example:

{{
    "files":[
        "index.html",
        "style.css"
    ]
}}

No markdown.
No explanation.
No comments.
"""
        )

        Logger.success("Website plan generated")

        Logger.info(plan)

        # --------------------------------------------------
        # HTML
        # --------------------------------------------------

        Logger.step("Generating index.html")

        html = self.llm.ask(
            f"""
Create a MODERN landing page.

Website Description:

{description}

Requirements:

- Dark Theme
- Hero Section
- Features Section
- CTA Button
- Responsive Design
- Use Tailwind CSS CDN
- Professional Startup Style

Return ONLY HTML.

Do not use markdown.
Do not use ```html
"""
        )

        Logger.success(
            f"HTML generated ({len(html)} chars)"
        )

        # --------------------------------------------------
        # CSS
        # --------------------------------------------------

        Logger.step("Generating style.css")

        css = self.llm.ask(
            f"""
Create CSS for the following website.

Website Description:

{description}

Requirements:

- Dark Theme
- Modern Cards
- Smooth Hover Effects
- Responsive Layout
- Modern Fonts
- Nice Buttons

Return ONLY CSS.

No markdown.
"""
        )

        Logger.success(
            f"CSS generated ({len(css)} chars)"
        )

        # --------------------------------------------------
        # SAVE HTML
        # --------------------------------------------------

        Logger.step("Saving index.html")

        with open(
            project_folder / "index.html",
            "w",
            encoding="utf-8"
        ) as file:

            file.write(html)

        Logger.success("index.html created")

        # --------------------------------------------------
        # SAVE CSS
        # --------------------------------------------------

        Logger.step("Saving style.css")

        with open(
            project_folder / "style.css",
            "w",
            encoding="utf-8"
        ) as file:

            file.write(css)

        Logger.success("style.css created")

        Logger.step("Website generation completed")

        return project_folder
