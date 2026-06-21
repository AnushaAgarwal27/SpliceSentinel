"""
Phoenix Evals: LLM-as-a-judge evaluators for drug interaction checker.

Evaluates whether Claude outputs are grounded in real FAERS data (no hallucination).
"""

from phoenix.evals import LLM, ClassificationEvaluator
import os


def create_grounding_evaluator():
    """
    Create an evaluator that scores whether Claude's narrative is grounded
    in the FAERS cases it was given.

    Scoring:
    - "grounded" (1.0): All claims cite or follow from the provided cases
    - "hallucinated" (0.0): Contains claims not supported by the data
    """
    return ClassificationEvaluator(
        name="grounding",
        llm=LLM(model="gpt-4o", provider="openai"),
        prompt_template="""
You are evaluating whether a clinical summary about a drug interaction is grounded
in real patient case data.

FAERS CASES PROVIDED TO CLAUDE:
{attributes.input.value}

CLAUDE'S NARRATIVE SUMMARY (what it output):
{attributes.output.value}

Task: Does every claim in Claude's summary come from or logically follow from
the FAERS cases provided?

Look for:
- ✅ Grounded: "elevated gastrointestinal bleeding" (if cases mention bleeding)
- ✅ Grounded: "typical onset within 2 weeks" (if cases show this timing)
- ❌ Hallucinated: "causes permanent liver damage" (if cases don't mention this)
- ❌ Hallucinated: "affects 50% of users" (if no prevalence data in cases)

Answer "grounded" or "hallucinated", then explain which claims are supported
and which (if any) lack evidence in the provided cases.
""",
        choices={"grounded": 1.0, "hallucinated": 0.0},
    )


def create_completeness_evaluator():
    """
    Evaluates whether Claude's narrative addresses the key patterns in the data.

    Scoring:
    - "complete" (1.0): Covers patient demographics, reactions, timing, severity
    - "incomplete" (0.0): Missing important aspects
    """
    return ClassificationEvaluator(
        name="completeness",
        llm=LLM(model="gpt-4o", provider="openai"),
        prompt_template="""
You are evaluating whether a clinical summary of a drug interaction adequately
summarizes the patterns in the provided patient cases.

FAERS CASES:
{attributes.input.value}

CLAUDE'S SUMMARY:
{attributes.output.value}

Does the summary address:
1. What reactions patients experienced?
2. When reactions typically started?
3. How severe the reactions appear?
4. Whether the pattern is consistent or scattered?

Answer "complete" or "incomplete", then explain what's missing (if anything).
""",
        choices={"complete": 1.0, "incomplete": 0.0},
    )
