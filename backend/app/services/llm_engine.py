import os
from typing import List, Optional
from app.core.config import settings

# Import clients (conditional import to avoid errors if deps missing during initial setup, though they should be there now)
try:
    from openai import OpenAI
    import google.generativeai as genai
except ImportError:
    OpenAI = None
    genai = None


class LLMEngine:
    def __init__(self):
        self.openai_client = (
            OpenAI(api_key=settings.OPENAI_API_KEY)
            if settings.OPENAI_API_KEY and OpenAI
            else None
        )
        if settings.GOOGLE_API_KEY and genai:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.google_ready = True
        else:
            self.google_ready = False

    def generate_response(
        self, model_name: str, system_prompt: str, messages: List[dict]
    ) -> str:
        """
        Generate response from LLM using the specified model name directly.
        """
        # User confirmed these are valid latest models.
        real_model = model_name

        if "gpt" in real_model:
            return self._call_openai(real_model, system_prompt, messages)
        elif "gemini" in real_model:
            return self._call_gemini(real_model, system_prompt, messages)
        else:
            return f"(Error: Unknown model provider for {model_name})"

    # Mapping removed as per user request

    def _call_openai(self, model: str, system_prompt: str, messages: List[dict]) -> str:
        if not self.openai_client:
            return "[System: OpenAI API Key not missing]"

        # Convert messages to OpenAI format if needed, but we assume list of dicts {role, content}
        # Prepend system prompt
        full_messages = [{"role": "system", "content": system_prompt}] + messages

        try:
            response = self.openai_client.chat.completions.create(
                model=model, messages=full_messages, temperature=0.7
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"[System Error: OpenAI call failed - {str(e)}]"

    def _call_gemini(self, model: str, system_prompt: str, messages: List[dict]) -> str:
        if not self.google_ready:
            return "[System: Google API Key missing]"

        # Gemini API (python SDK) structure
        gemini_model = genai.GenerativeModel(model)

        # Construct prompt
        full_prompt = f"System Instruction: {system_prompt}\n\n"
        for msg in messages:
            full_prompt += f"{msg['role']}: {msg['content']}\n"
        full_prompt += "You:"

        # Retry logic with exponential backoff
        max_retries = 3
        last_error = None

        for attempt in range(max_retries):
            try:
                response = gemini_model.generate_content(full_prompt)
                return response.text
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    import time

                    # Longer wait times: 5s, 15s, 45s
                    wait_time = 5 * (3**attempt)
                    time.sleep(wait_time)
                continue

        return f"[System Error: Google Gemini call failed after {max_retries} retries - {str(last_error)}]"
