# Shopping Buddy (FastAPI)

Shopping Buddy is a beginner-friendly FastAPI app that generates personalized product recommendations. It loads mock customer and product data from CSV files, builds a short customer profile, filters candidate products, and then asks an LLM (Gemini or Ollama) to return the top 5 recommendations.

## What You Need

- Python 3.11 or newer
- Windows PowerShell (commands below are PowerShell-friendly)
- Optional: Gemini API key or local Ollama installation

## Quick Start (Windows + venv)

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Quick Start (macOS/Linux + venv)

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
```

## Configure Environment Variables

Create or edit the `.env` file in the project root (start from `.env.example`):

```env
GOOGLE_API_KEY=your_gemini_api_key
ENABLE_OLLAMA=false
OLLAMA_API_URL=http://localhost:11434
LLM_SERVICE=gemini
RATE_LIMIT=10/minute
CORS_ALLOW_ORIGINS=*
CUSTOMER_DATA_FILE=data/customer_data_collection.csv
PRODUCT_DATA_FILE=data/product_recommendation_data.csv
DB_NAME=shopping_buddy.db
```

Notes:
- If you want to use Gemini, set `GOOGLE_API_KEY` and keep `LLM_SERVICE=gemini`.
- If you want to use Ollama, set `ENABLE_OLLAMA=true` and `LLM_SERVICE=ollama`.
- Keep values unquoted in `.env` to avoid parsing issues.

## Run the App

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 3000
```

Open your browser at:
- `http://localhost:3000/`

## How to Use

1. Enter a Customer ID (example: `C1001`).
2. Choose an LLM service and model.
3. Click "Get Recommendations".

You can also try the Quick Try buttons to auto-fill a sample ID.

## Health Check

Use the health endpoint to verify the server is running:

`http://localhost:3000/health`

It returns status, current UTC timestamp, and uptime in seconds.

## Project Structure

```
app/
	api/          # FastAPI routes
	core/         # Settings and rate limit setup
	db/           # Async SQLite helpers
	schemas/      # Pydantic models
	services/     # Data loader and LLM agents
	templates/    # Jinja2 HTML templates
public/         # Static assets (JS/CSS)
data/           # CSV datasets
```

## Common Issues

- "Gemini API key not configured": Make sure `GOOGLE_API_KEY` is set in `.env` and restart Uvicorn.
- "Ollama is disabled": Set `ENABLE_OLLAMA=true` and restart Uvicorn.
- "No candidate products": Try a different customer ID from the dataset.

## Environment Variables Reference

- `GOOGLE_API_KEY`: Required to use Gemini.
- `ENABLE_OLLAMA`: Set to `true` to enable Ollama models.
- `OLLAMA_API_URL`: Override the default Ollama host (default: `http://localhost:11434`).
- `LLM_SERVICE`: Default service (`gemini` or `ollama`).
- `RATE_LIMIT`: SlowAPI rate limit for POST `/` (default: `10/minute`).
- `CORS_ALLOW_ORIGINS`: Comma-separated list of allowed origins (default: `*`).
- `CUSTOMER_DATA_FILE`: Path to customer CSV (default: `data/customer_data_collection.csv`).
- `PRODUCT_DATA_FILE`: Path to product CSV (default: `data/product_recommendation_data.csv`).
- `DB_NAME`: SQLite database file (default: `shopping_buddy.db`).
