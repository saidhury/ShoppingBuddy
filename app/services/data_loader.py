import csv
from pathlib import Path
from typing import Dict, List, Tuple

from app.core.config import Settings


def safe_parse_list(value: str) -> List[str]:
    if not value or not isinstance(value, str):
        return []
    text = value.strip()
    if text.startswith("[") and text.endswith("]"):
        try:
            inner = text[1:-1]
            return [
                item.strip().strip("\"'")
                for item in inner.split(",")
                if item.strip()
            ]
        except Exception:
            return []
    return []


def _load_csv(path: Path) -> List[Dict[str, str]]:
    with path.open("r", newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def load_and_preprocess_data(settings: Settings) -> Tuple[Dict[str, dict], Dict[str, dict]]:
    customer_path = Path(settings.customer_data_file)
    product_path = Path(settings.product_data_file)

    raw_customers = _load_csv(customer_path)
    raw_products = _load_csv(product_path)

    customer_map: Dict[str, dict] = {}
    for customer in raw_customers:
        customer_id = customer.get(settings.cust_id_col)
        if not customer_id:
            continue
        customer[settings.cust_browsing_col] = safe_parse_list(
            customer.get(settings.cust_browsing_col, "")
        )
        customer[settings.cust_purchase_col] = safe_parse_list(
            customer.get(settings.cust_purchase_col, "")
        )
        try:
            customer[settings.cust_avg_order_col] = float(
                customer.get(settings.cust_avg_order_col, 0) or 0
            )
        except ValueError:
            customer[settings.cust_avg_order_col] = 0
        try:
            customer[settings.cust_age_col] = int(customer.get(settings.cust_age_col) or 0)
        except ValueError:
            customer[settings.cust_age_col] = None
        customer_map[customer_id] = customer

    product_map: Dict[str, dict] = {}
    for product in raw_products:
        product_id = product.get(settings.prod_id_col)
        if not product_id:
            continue
        product[settings.prod_similar_col] = safe_parse_list(
            product.get(settings.prod_similar_col, "")
        )
        try:
            product[settings.prod_rating_col] = float(
                product.get(settings.prod_rating_col, 0) or 0
            )
        except ValueError:
            product[settings.prod_rating_col] = 0
        try:
            product[settings.prod_price_col] = float(product.get(settings.prod_price_col, 0) or 0)
        except ValueError:
            product[settings.prod_price_col] = 0
        product_map[product_id] = product

    return customer_map, product_map
