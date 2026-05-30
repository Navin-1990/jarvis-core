from app.core.llm import LocalLLM


class ContentGenerator:

    def __init__(self):
        self.llm = LocalLLM()

    def generate_website_content(self, user_request):

        prompt = f"""
Generate website content.

Website Description:

{user_request}

Return ONLY JSON.

Example:

{{
    "title":"My Website",
    "subtitle":"Description",
    "feature1":"Feature 1",
    "feature2":"Feature 2",
    "feature3":"Feature 3"
}}
"""

        return self.llm.ask(prompt)