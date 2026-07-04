from app.services.notebook import execute_cell, serialize_to_ipynb


def test_execute_hello():
    result = execute_cell('print("hello")')
    assert result["stdout"].strip() == "hello"
    assert result["stderr"] == ""
    assert result["error"] is None


def test_execute_stderr():
    result = execute_cell("import sys; print('err', file=sys.stderr)")
    assert "err" in result["stderr"]


def test_execute_timeout():
    result = execute_cell("import time; time.sleep(30)", timeout=1)
    assert result["error"] is not None
    assert "timed out" in result["error"].lower()


def test_serialize_ipynb():
    cells = [
        {"id": "1", "type": "markdown", "source": "# Hello", "outputs": []},
        {
            "id": "2",
            "type": "code",
            "source": "print('hi')",
            "outputs": [{"output_type": "stream", "text": "hi\n"}],
            "execution_count": 1,
        },
    ]
    nb = serialize_to_ipynb(cells)
    assert nb["nbformat"] == 4
    assert len(nb["cells"]) == 2
    assert nb["cells"][0]["cell_type"] == "markdown"
    assert nb["cells"][1]["cell_type"] == "code"
    assert nb["cells"][1]["outputs"][0]["output_type"] == "stream"
