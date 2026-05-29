import subprocess
import sys
import json
from typing import Any


def execute_cell(code: str, timeout: int = 10) -> dict:
    """Run Python code in a sandboxed subprocess; return stdout/stderr."""
    try:
        result = subprocess.run(
            [sys.executable, "-c", code],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "error": None,
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "", "error": "Execution timed out (10s limit)"}
    except Exception as e:
        return {"stdout": "", "stderr": "", "error": str(e)}


def serialize_to_ipynb(cells: list[dict[str, Any]]) -> dict:
    """Convert cell list to standard .ipynb v4 JSON."""
    nb_cells = []
    for cell in cells:
        if cell.get("type") == "markdown":
            nb_cells.append({
                "cell_type": "markdown",
                "metadata": {},
                "source": cell.get("source", ""),
            })
        else:
            outputs = []
            for out in cell.get("outputs", []):
                if out.get("output_type") == "stream":
                    outputs.append({
                        "output_type": "stream",
                        "name": "stdout",
                        "text": out.get("text", ""),
                    })
                elif out.get("output_type") == "error":
                    outputs.append({
                        "output_type": "error",
                        "ename": "Error",
                        "evalue": out.get("text", ""),
                        "traceback": [],
                    })
            nb_cells.append({
                "cell_type": "code",
                "execution_count": cell.get("execution_count"),
                "metadata": {},
                "outputs": outputs,
                "source": cell.get("source", ""),
            })
    return {
        "nbformat": 4,
        "nbformat_minor": 5,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11"},
        },
        "cells": nb_cells,
    }
