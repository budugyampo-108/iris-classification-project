"""
FastAPI backend for the Iris classifier.

Endpoints
    GET  /api/metrics   -> evaluation metrics + confusion matrix (JSON)
    POST /api/predict   -> predicted species + class probabilities
    GET  /api/health    -> simple health check

Run locally from the repo root:
    uvicorn backend.main:app --reload --port 8000
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Dict

import joblib
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.joblib"
METRICS_PATH = BASE_DIR / "metrics.json"

if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))


def _load_artifacts():
    """Load the saved model + metrics. If they are missing or were built with an
    incompatible scikit-learn version (common on fresh deployments), retrain
    in-memory - Iris is tiny so this takes well under a second."""
    try:
        bundle = joblib.load(MODEL_PATH)
        metrics = json.loads(METRICS_PATH.read_text())
        return bundle["model"], bundle["class_names"], metrics
    except Exception:
        from train import train  # local import

        result = train(save=False)
        return result["model"], result["class_names"], result["metrics"]


MODEL, CLASS_NAMES, METRICS = _load_artifacts()

app = FastAPI(
    title="Iris Classifier API",
    description="Random Forest classifier for the Iris dataset.",
    version="1.0.0",
)

# Allow the web app and the Expo mobile app to call the API from any origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class IrisFeatures(BaseModel):
    sepal_length: float = Field(..., gt=0, le=15, description="Sepal length in cm", examples=[5.1])
    sepal_width: float = Field(..., gt=0, le=15, description="Sepal width in cm", examples=[3.5])
    petal_length: float = Field(..., gt=0, le=15, description="Petal length in cm", examples=[1.4])
    petal_width: float = Field(..., gt=0, le=15, description="Petal width in cm", examples=[0.2])


class PredictionResponse(BaseModel):
    species: str
    confidence: float
    probabilities: Dict[str, float]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/metrics")
def get_metrics():
    """Return all evaluation metrics and the confusion matrix."""
    return METRICS


@app.post("/api/predict", response_model=PredictionResponse)
def predict(features: IrisFeatures):
    """Predict the iris species from four measurements (cm)."""
    x = np.array(
        [[features.sepal_length, features.sepal_width, features.petal_length, features.petal_width]]
    )
    proba = MODEL.predict_proba(x)[0]
    idx = int(np.argmax(proba))
    return PredictionResponse(
        species=CLASS_NAMES[idx],
        confidence=float(proba[idx]),
        probabilities={name: float(p) for name, p in zip(CLASS_NAMES, proba)},
    )
