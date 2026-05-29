from app.models.models import Round
from app.services.ai_service import evaluate_submission


async def run_ai_evaluation(round_: Round, content: str) -> dict:
    provider = round_.ai_provider or "claude"
    return await evaluate_submission(
        provider=provider,
        submission_content=content,
        criteria=round_.evaluation_criteria or "Evaluate the submission holistically.",
        round_type=round_.type,
    )
