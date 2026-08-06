#!/usr/bin/env python3
"""Run the complete synthetic-to-shadow graduation workflow."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run(script: str) -> None:
    command = [sys.executable, str(Path(__file__).with_name(script))]
    print(f"\n==> {' '.join(command)}", flush=True)
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skip-upgrade-simulation",
        action="store_true",
        help="Reuse an existing candidate report and registry.",
    )
    args = parser.parse_args()
    run("export_observed_lifecycle.py")
    if not args.skip_upgrade_simulation:
        run("simulate_model_upgrade.py")
    run("stress_test_adherence_model.py")
    run("validate_pre_real_data_readiness.py")
    print(
        "\nPre-real-data checkpoint passed: engineering=complete, "
        "deployment=shadow_only, production_ready=false"
    )


if __name__ == "__main__":
    main()
