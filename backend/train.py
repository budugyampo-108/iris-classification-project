"""
train.py - Train a Random Forest on the Iris dataset and save:
    - model.joblib   (the trained classifier)
    - metrics.json   (all evaluation metrics + confusion matrix + dataset summary)

Run from the repo root:
    python backend/train.py
"""
from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    classification_report,
)
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.preprocessing import label_binarize

BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "model.joblib"
METRICS_PATH = BASE_DIR / "metrics.json"

RANDOM_STATE = 42
TEST_SIZE = 0.2


def train(save: bool = True) -> dict:
    # 1. Load data -----------------------------------------------------------
    iris = load_iris()
    X, y = iris.data, iris.target
    class_names = [str(n) for n in iris.target_names]  # setosa, versicolor, virginica
    feature_names = [n.replace(" (cm)", "").replace(" ", "_") for n in iris.feature_names]

    # 2. Split (stratified so each class keeps the same proportion) ----------
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
    )

    # 3. Train ----------------------------------------------------------------
    model = RandomForestClassifier(
        n_estimators=200, max_depth=None, random_state=RANDOM_STATE
    )
    model.fit(X_train, y_train)

    # 4. Evaluate ---------------------------------------------------------------
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    y_test_bin = label_binarize(y_test, classes=[0, 1, 2])

    cm = confusion_matrix(y_test, y_pred)
    cv_scores = cross_val_score(
        RandomForestClassifier(n_estimators=200, random_state=RANDOM_STATE), X, y, cv=5
    )

    report = classification_report(
        y_test, y_pred, target_names=class_names, output_dict=True, zero_division=0
    )

    metrics = {
        "model": "RandomForestClassifier",
        "hyperparameters": {"n_estimators": 200, "max_depth": None, "random_state": RANDOM_STATE},
        "split": {
            "train_size": int(len(X_train)),
            "test_size": int(len(X_test)),
            "test_fraction": TEST_SIZE,
            "stratified": True,
        },
        "accuracy": float(accuracy_score(y_test, y_pred)),
        # Weighted precision (accounts for class support)
        "precision": float(precision_score(y_test, y_pred, average="weighted", zero_division=0)),
        "macro_precision": float(precision_score(y_test, y_pred, average="macro", zero_division=0)),
        "macro_recall": float(recall_score(y_test, y_pred, average="macro", zero_division=0)),
        "macro_f1": float(f1_score(y_test, y_pred, average="macro", zero_division=0)),
        # One-vs-Rest ROC-AUC, macro-averaged over the three classes
        "roc_auc_ovr": float(roc_auc_score(y_test_bin, y_proba, average="macro", multi_class="ovr")),
        "confusion_matrix": cm.tolist(),
        "class_names": class_names,
        "per_class": {
            name: {
                "precision": float(report[name]["precision"]),
                "recall": float(report[name]["recall"]),
                "f1": float(report[name]["f1-score"]),
                "support": int(report[name]["support"]),
            }
            for name in class_names
        },
        "cross_validation": {
            "folds": 5,
            "mean_accuracy": float(np.mean(cv_scores)),
            "std_accuracy": float(np.std(cv_scores)),
        },
        "feature_importance": {
            f: float(v) for f, v in zip(feature_names, model.feature_importances_)
        },
        "dataset": {
            "samples": int(X.shape[0]),
            "features": feature_names,
            "classes": class_names,
            "class_counts": {n: int((y == i).sum()) for i, n in enumerate(class_names)},
            "feature_ranges": {
                f: {
                    "min": float(X[:, i].min()),
                    "max": float(X[:, i].max()),
                    "mean": float(X[:, i].mean()),
                }
                for i, f in enumerate(feature_names)
            },
        },
    }

    # 5. Save artifacts -------------------------------------------------------
    if save:
        joblib.dump({"model": model, "class_names": class_names, "feature_names": feature_names}, MODEL_PATH)
        METRICS_PATH.write_text(json.dumps(metrics, indent=2))

    return {"model": model, "metrics": metrics, "class_names": class_names}


if __name__ == "__main__":
    result = train(save=True)
    m = result["metrics"]
    print("Model trained and saved.")
    print(f"  Accuracy        : {m['accuracy']:.4f}")
    print(f"  Precision (w)   : {m['precision']:.4f}")
    print(f"  Macro-Precision : {m['macro_precision']:.4f}")
    print(f"  Macro-Recall    : {m['macro_recall']:.4f}")
    print(f"  Macro-F1        : {m['macro_f1']:.4f}")
    print(f"  ROC-AUC (OvR)   : {m['roc_auc_ovr']:.4f}")
    print(f"  Confusion matrix:\n{np.array(m['confusion_matrix'])}")
    print(f"  Saved: {MODEL_PATH.name}, {METRICS_PATH.name}")
