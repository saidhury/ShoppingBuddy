from enum import Enum
from typing import Optional

from fastapi import Form
from pydantic import BaseModel, Field


class LlmService(str, Enum):
    gemini = "gemini"
    ollama = "ollama"


class GenerationModel(str, Enum):
    gemini_3_1_flash_lite_preview = "gemini-3.1-flash-lite-preview"
    llama3_2 = "llama3.2"


class RecommendationRequest(BaseModel):
    customer_id: str = Field(..., pattern=r"^C\d{4}$")
    llm_service: LlmService
    generation_model: GenerationModel

    @classmethod
    def as_form(
        cls,
        customer_id: str = Form(...),
        llm_service: LlmService = Form(...),
        generation_model: GenerationModel = Form(...),
    ) -> "RecommendationRequest":
        return cls(
            customer_id=customer_id.strip(),
            llm_service=llm_service,
            generation_model=generation_model,
        )


class LlmRecommendation(BaseModel):
    product_id: str
    explanation: Optional[str] = None
