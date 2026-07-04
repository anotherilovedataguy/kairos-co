import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.ai_service import evaluate_submission


@pytest.mark.asyncio
async def test_evaluate_returns_score_and_feedback():
    mock_response = json.dumps({"score": 85.0, "feedback": "Good submission."})
    with patch("app.services.ai_service._one_shot_claude", new_callable=AsyncMock) as mock:
        mock.return_value = mock_response
        result = await evaluate_submission("claude", "resume content", "Look for Python skills", "resume")
    assert result["score"] == 85.0
    assert result["feedback"] == "Good submission."


@pytest.mark.asyncio
async def test_evaluate_handles_malformed_json():
    with patch("app.services.ai_service._one_shot_claude", new_callable=AsyncMock) as mock:
        mock.return_value = "Unable to evaluate."
        result = await evaluate_submission("claude", "content", "criteria", "coding")
    assert result["score"] is None
    assert "Unable to evaluate" in result["feedback"]
