from functools import lru_cache
from typing import Dict, List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    google_api_key: Optional[str] = Field(None, env="GOOGLE_API_KEY")
    enable_ollama: bool = Field(False, env="ENABLE_OLLAMA")
    default_llm_service: str = Field("gemini", env="LLM_SERVICE")
    gemini_api_key_env_var: str = "GOOGLE_API_KEY"
    ollama_api_url: str = Field("http://localhost:11434", env="OLLAMA_API_URL")

    available_ollama_models: List[str] = ["llama3.2"]
    available_gemini_models: List[str] = ["gemini-3.1-flash-lite-preview"]

    customer_data_file: str = Field("data/customer_data_collection.csv", env="CUSTOMER_DATA_FILE")
    product_data_file: str = Field("data/product_recommendation_data.csv", env="PRODUCT_DATA_FILE")
    db_name: str = Field("shopping_buddy.db", env="DB_NAME")

    cust_id_col: str = "Customer_ID"
    cust_age_col: str = "Age"
    cust_gender_col: str = "Gender"
    cust_location_col: str = "Location"
    cust_browsing_col: str = "Browsing_History"
    cust_purchase_col: str = "Purchase_History"
    cust_segment_col: str = "Customer_Segment"
    cust_avg_order_col: str = "Avg_Order_Value"
    cust_holiday_col: str = "Holiday"
    cust_season_col: str = "Season"

    prod_id_col: str = "Product_ID"
    prod_category_col: str = "Category"
    prod_subcategory_col: str = "Subcategory"
    prod_price_col: str = "Price"
    prod_brand_col: str = "Brand"
    prod_avg_similar_rating_col: str = "Average_Rating_of_Similar_Products"
    prod_rating_col: str = "Product_Rating"
    prod_sentiment_col: str = "Customer_Review_Sentiment_Score"
    prod_holiday_col: str = "Holiday"
    prod_season_col: str = "Season"
    prod_geography_col: str = "Geographical_Location"
    prod_similar_col: str = "Similar_Product_List"
    prod_probability_col: str = "Probability_of_Recommendation"

    max_candidates_to_llm: int = 30
    max_candidate_details_in_prompt: int = 15

    rate_limit: str = Field("10/minute", env="RATE_LIMIT")
    cors_allow_origins: List[str] = Field(["*"], env="CORS_ALLOW_ORIGINS")

    class Config:
        env_file = ".env"
        case_sensitive = False
        extra = "ignore"

    def model_options(self) -> Dict[str, List[str]]:
        options: Dict[str, List[str]] = {"gemini": list(self.available_gemini_models)}
        if self.enable_ollama:
            options["ollama"] = list(self.available_ollama_models)
        return options


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
