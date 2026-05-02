from pathlib import Path
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.core.config import get_settings
from app.core.rate_limit import limiter
from app.schemas.payloads import LlmRecommendation, RecommendationRequest
from app.services.agents import (
    get_customer_profile,
    get_llm_recommendations,
    select_candidate_products,
)

router = APIRouter()

templates = Jinja2Templates(
    directory=str(Path(__file__).resolve().parents[1] / "templates")
)


def _default_selected_model(model_options: Dict[str, List[str]], service: str) -> str:
    models = model_options.get(service, [])
    return models[0] if models else ""


@router.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "UP",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "uptime": time.monotonic(),
    }


@router.get("/", response_class=HTMLResponse)
async def index(request: Request) -> HTMLResponse:
    settings = get_settings()
    model_options = settings.model_options()
    selected_service = settings.default_llm_service
    selected_model = _default_selected_model(model_options, selected_service)

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "customer_id": "",
            "profile_summary": None,
            "recommendations": None,
            "debug_info": None,
            "model_options": model_options,
            "selected_service": selected_service,
            "selected_model": selected_model,
            "flash_error": None,
        },
    )


@router.post("/", response_class=HTMLResponse)
@limiter.limit(get_settings().rate_limit)
async def recommend(
    request: Request,
    payload: RecommendationRequest = Depends(RecommendationRequest.as_form),
) -> HTMLResponse:
    settings = get_settings()
    model_options = settings.model_options()

    customer_map = getattr(request.app.state, "customer_map", None)
    product_map = getattr(request.app.state, "product_map", None)
    if not customer_map or not product_map:
        return templates.TemplateResponse(
            "index.html",
            {
                "request": request,
                "customer_id": payload.customer_id,
                "profile_summary": None,
                "recommendations": None,
                "debug_info": None,
                "model_options": model_options,
                "selected_service": payload.llm_service.value,
                "selected_model": payload.generation_model.value,
                "flash_error": "Service temporarily unavailable - data not loaded.",
            },
            status_code=503,
        )

    selected_service = payload.llm_service.value
    selected_model = payload.generation_model.value

    if selected_service not in model_options:
        flash_error = "Invalid LLM service selection."
    elif selected_model not in model_options.get(selected_service, []):
        flash_error = "Invalid generation model for the selected service."
    elif selected_service == "gemini" and not request.app.state.gemini_key_configured:
        flash_error = f"Error: Gemini selected, but {settings.gemini_api_key_env_var} env var not set."
    elif selected_service == "ollama" and not settings.enable_ollama:
        flash_error = "Error: Ollama is disabled by configuration."
    else:
        flash_error = None

    profile_summary: Optional[str] = None
    recommendations_list: Optional[List[dict]] = None
    debug_info: Optional[Dict[str, Any]] = None

    if flash_error is None:
        debug_info = {"steps": ["Received Request"], "prompt": "", "llm_output": None}
        profile_summary, profile_error = await get_customer_profile(
            payload.customer_id, customer_map, settings
        )
        if profile_error:
            flash_error = profile_error
        else:
            debug_info["steps"].append("Fetched Customer Profile")

        if flash_error is None and profile_summary:
            candidates = select_candidate_products(
                payload.customer_id, customer_map, product_map, settings
            )
            if not candidates:
                flash_error = "No suitable candidate products found based on profile filtering."
                recommendations_list = []
                debug_info["steps"].append("No candidate products found")
            else:
                debug_info["steps"].append(
                    f"DB filter: {len(candidates)} candidate products"
                )
                llm_result = await get_llm_recommendations(
                    profile_summary,
                    candidates,
                    selected_service,
                    selected_model,
                    settings,
                )
                debug_info["prompt"] = llm_result.get("prompt") or ""
                debug_info["llm_output"] = llm_result.get("raw_output")

                if llm_result.get("error"):
                    flash_error = f"LLM Error: {llm_result['error']}"
                else:
                    parsed = llm_result.get("recommendations") or []
                    valid_items: List[LlmRecommendation] = []
                    for item in parsed:
                        try:
                            valid_items.append(LlmRecommendation(**item))
                        except Exception:
                            continue

                    recommendations_list = []
                    for rec in valid_items:
                        prod_data = product_map.get(rec.product_id)
                        if not prod_data:
                            recommendations_list.append(
                                {
                                    "id": rec.product_id,
                                    "category": "N/A",
                                    "error": "Product details not found",
                                    "explanation": rec.explanation,
                                }
                            )
                            continue
                        recommendations_list.append(
                            {
                                "id": rec.product_id,
                                "category": prod_data.get(settings.prod_category_col, "N/A"),
                                "subcategory": prod_data.get(
                                    settings.prod_subcategory_col, "N/A"
                                ),
                                "brand": prod_data.get(settings.prod_brand_col, "N/A"),
                                "price": prod_data.get(settings.prod_price_col, "N/A"),
                                "rating": prod_data.get(settings.prod_rating_col, "N/A"),
                                "why": rec.explanation,
                            }
                        )

                debug_info["steps"].append(
                    f"Queried LLM: {selected_service.upper()} - {selected_model}"
                )

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "customer_id": payload.customer_id,
            "profile_summary": profile_summary,
            "recommendations": recommendations_list,
            "debug_info": debug_info,
            "model_options": model_options,
            "selected_service": selected_service,
            "selected_model": selected_model,
            "flash_error": flash_error,
        },
    )
