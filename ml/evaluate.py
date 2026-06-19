#!/usr/bin/env python3
"""Evaluate latest model run against baselines."""

from __future__ import annotations

import json
import os
import sys

import psycopg

def main() -> None:
    user_id = sys.argv[1] if len(sys.argv) > 1 else None
    if not user_id:
        print("Usage: evaluate.py <user_id>")
        sys.exit(1)

    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        sys.exit(1)

    with psycopg.connect(database_url) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT model_version, mae, rmse, baseline_comparison, beats_baselines, sample_count, created_at
                FROM model_runs
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (user_id,),
            )
            row = cur.fetchone()

    if not row:
        print(json.dumps({"error": "no model runs found"}))
        sys.exit(1)

    print(json.dumps({
        "model_version": row[0],
        "mae": row[1],
        "rmse": row[2],
        "baseline_comparison": row[3],
        "beats_baselines": row[4],
        "sample_count": row[5],
        "created_at": row[6].isoformat() if row[6] else None,
    }))


if __name__ == "__main__":
    main()
