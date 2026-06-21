"""
Part 1: LLM-as-a-Judge Evaluator Definition

This produces a ClassificationEvaluator that returns:
- label: "grounded" or "hallucinated"
- score: 1.0 or 0.0
- explanation: why the judgment was made
"""

from phoenix.evals import LLM, ClassificationEvaluator

judge = ClassificationEvaluator(
    name="grounding",
    llm=LLM(model="claude-opus-4-7", provider="anthropic"),
    prompt_template="""
        Is the Claude narrative summary strictly grounded in the FAERS cases provided?

        FAERS Cases (source data): {attributes.input.value}
        Claude's Narrative: {attributes.output.value}

        Answer "grounded" or "hallucinated", then explain why.
        Grounded means: every claim comes from the source data.
        Hallucinated means: at least one claim is not supported by the data.
    """,
    choices={"grounded": 1.0, "hallucinated": 0.0},
)
