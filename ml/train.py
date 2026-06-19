#!/usr/bin/env python3
"""XGBoost training pipeline for Cortex Bio (Phase 7)."""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import date, datetime

import numpy as np
import pandas as pd
import psycopg
import xgboost as xgb
from sklearn.metrics import mean_absolute_error, mean_squared_error

FEATURES = [
    "sleep_duration",
    "sleep_efficiency",
    "avg_hrv",
    "hrv_vs_baseline_pct",
    "resting_hr",
    "steps",
    "exercise_minutes",
    "readiness_score",
    "weekday",
]

CHRONOTYPE_MAP = {
    "morning_lark": 0,
    "moderate_morning": 1,
    "neutral": 2,
    "moderate_evening": 3,
    "night_owl": 4,
}

TARGETS = {
    "attention": "attention_score",
    "deep_work": "deep_work_minutes",
    "output": "output_score",
}

MODEL_VERSION = "xgb-v1"


def load_dataset(conn, user_id: str) -> pd.DataFrame:
    query = """
        SELECT * FROM v_training_dataset
        WHERE user_id = %s
        ORDER BY date ASC
    """
    df = pd.read_sql(query, conn, params=(user_id,))
    df["chronotype_enc"] = df["chronotype_classification"].map(CHRONOTYPE_MAP).fillna(2)
    return df


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    for col in FEATURES:
        if col not in df.columns:
            df[col] = np.nan
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df[FEATURES] = df[FEATURES].fillna(df[FEATURES].median())
    return df


def evaluate_baselines(y_true: np.ndarray, y_hist: np.ndarray, y_roll: np.ndarray, y_rules: np.ndarray, y_pred: np.ndarray) -> dict:
    return {
        "model_mae": float(mean_absolute_error(y_true, y_pred)),
        "yesterday_mae": float(mean_absolute_error(y_true, y_hist)),
        "rolling7_mae": float(mean_absolute_error(y_true, y_roll)),
        "readiness_mae": float(mean_absolute_error(y_true, y_rules)),
    }


def train_target(df: pd.DataFrame, target_col: str) -> tuple[dict, dict, xgb.XGBRegressor | None]:
    subset = df.dropna(subset=[target_col]).copy()
    if len(subset) < 21:
        return {}, {}, None

    train = subset.iloc[:-7]
    test = subset.iloc[-7:]

    X_train = train[FEATURES + ["chronotype_enc"]]
    y_train = train[target_col]
    X_test = test[FEATURES + ["chronotype_enc"]]
    y_test = test[target_col]

    model = xgb.XGBRegressor(
        n_estimators=80,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42,
    )
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    y_yesterday = test[target_col].shift(1).bfill()
    y_roll = test[target_col].expanding().mean()
    y_rules = test["readiness_score"].fillna(test[target_col].median())

    metrics = evaluate_baselines(
        y_test.values, y_yesterday.values, y_roll.values, y_rules.values, y_pred
    )
    metrics["rmse"] = float(np.sqrt(mean_squared_error(y_test, y_pred)))

    importance = dict(zip(X_train.columns, model.feature_importances_.tolist()))

    return metrics, importance, model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True)
    args = parser.parse_args()

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print(json.dumps({"error": "DATABASE_URL not set"}), file=sys.stderr)
        sys.exit(1)

    with psycopg.connect(database_url) as conn:
        df = load_dataset(conn, args.user_id)
        if len(df) < 21:
            print(json.dumps({"error": f"insufficient data: {len(df)} rows"}), file=sys.stderr)
            sys.exit(1)

        df = prepare_features(df)

        mae_scores: dict = {}
        rmse_scores: dict = {}
        importance_scores: dict = {}
        baseline_comparison: dict = {}
        beats_all = True

        for name, col in TARGETS.items():
            metrics, importance, model = train_target(df, col)
            if model is None:
                continue
            mae_scores[name] = metrics["model_mae"]
            rmse_scores[name] = metrics["rmse"]
            importance_scores[name] = importance
            baseline_comparison[name] = metrics
            if not (
                metrics["model_mae"] <= metrics["yesterday_mae"]
                and metrics["model_mae"] <= metrics["rolling7_mae"]
                and metrics["model_mae"] <= metrics["readiness_mae"]
            ):
                beats_all = False

        training_start = df["date"].min()
        training_end = df["date"].max()

        run_id = str(uuid.uuid4())
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO model_runs (
                    id, user_id, model_version, training_start, training_end,
                    status, mae, rmse, feature_importance, baseline_comparison,
                    beats_baselines, sample_count
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s, %s
                )
                """,
                (
                    run_id,
                    args.user_id,
                    MODEL_VERSION,
                    training_start,
                    training_end,
                    "validated" if beats_all else "below_baseline",
                    json.dumps(mae_scores),
                    json.dumps(rmse_scores),
                    json.dumps(importance_scores),
                    json.dumps(baseline_comparison),
                    beats_all,
                    len(df),
                ),
            )
        conn.commit()

    print(json.dumps({
        "beats_baselines": beats_all,
        "sample_count": len(df),
        "mae": mae_scores,
        "rmse": rmse_scores,
    }))


if __name__ == "__main__":
    main()
