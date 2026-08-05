#!/usr/bin/env python3
"""Serve the synthetic adherence models for local shadow-mode development."""

from __future__ import annotations

import argparse
import json
import math
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import joblib
import numpy as np

from train_adherence_model import FEATURE_COLUMNS


class ModelRuntime:
    def __init__(self, model_dir: Path) -> None:
        self.risk_model = joblib.load(model_dir / "risk_model.joblib")
        self.change_model = joblib.load(model_dir / "behaviour_change_model.joblib")
        self.metadata = json.loads((model_dir / "metadata.json").read_text(encoding="utf-8"))
        self.version = (
            f"synthetic-{self.metadata.get('seed', 'unknown')}-"
            f"{self.metadata.get('backend', 'unknown')}"
        )

    def predict(self, features: dict[str, Any]) -> dict[str, Any]:
        missing = [column for column in FEATURE_COLUMNS if column not in features]
        if missing:
            raise ValueError(f"missing feature columns: {', '.join(missing)}")

        values: list[float] = []
        for column in FEATURE_COLUMNS:
            value = float(features[column])
            if not math.isfinite(value):
                raise ValueError(f"feature must be finite: {column}")
            values.append(value)
        matrix = np.asarray([values], dtype=np.float32)
        return {
            "modelSource": "synthetic",
            "modelVersion": self.version,
            "riskProbability": round(
                float(self.risk_model.predict_proba(matrix)[0, 1]), 6
            ),
            "behaviourChangeProbability": round(
                float(self.change_model.predict_proba(matrix)[0, 1]), 6
            ),
        }


def create_handler(runtime: ModelRuntime) -> type[BaseHTTPRequestHandler]:
    class Handler(BaseHTTPRequestHandler):
        server_version = "SmartPillboxShadowModel/0.1"

        def send_json(self, status: int, payload: dict[str, Any]) -> None:
            body = json.dumps(payload).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self) -> None:  # noqa: N802
            if self.path != "/health":
                self.send_json(404, {"error": "not found"})
                return
            self.send_json(
                200,
                {
                    "status": "ok",
                    "modelSource": "synthetic",
                    "modelVersion": runtime.version,
                },
            )

        def do_POST(self) -> None:  # noqa: N802
            if self.path != "/predict":
                self.send_json(404, {"error": "not found"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
                if length < 2 or length > 100_000:
                    raise ValueError("invalid request size")
                payload = json.loads(self.rfile.read(length))
                if not isinstance(payload, dict) or not isinstance(
                    payload.get("features"), dict
                ):
                    raise ValueError("body must contain a features object")
                self.send_json(200, runtime.predict(payload["features"]))
            except (ValueError, TypeError, json.JSONDecodeError) as error:
                self.send_json(400, {"error": str(error)})

        def log_message(self, format: str, *args: object) -> None:
            print(f"[shadow-model] {self.address_string()} {format % args}")

    return Handler


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8010)
    parser.add_argument("--model-dir", type=Path, default=Path(".data/ml/model"))
    args = parser.parse_args()
    runtime = ModelRuntime(args.model_dir)
    server = ThreadingHTTPServer((args.host, args.port), create_handler(runtime))
    print(
        f"shadow model service listening on http://{args.host}:{args.port} "
        f"version={runtime.version}"
    )
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
