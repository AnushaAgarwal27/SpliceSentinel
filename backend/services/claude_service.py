"""
PART 4: Claude Integration

Uses Claude API to:
1. Summarize FAERS narrative text into plain language
2. Generate clinical documentation notes

Two functions:
  - summarize_narrative_pattern(): Read patient stories, summarize patterns
  - generate_clinical_note(): Write doctor-ready documentation
"""

from anthropic import Anthropic
from typing import List, Dict
import os
from sentry_utils import capture_exception

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = Anthropic(api_key=ANTHROPIC_API_KEY)


def summarize_narrative_pattern(
    drug_a: str,
    drug_b: str,
    flagged_reports: List[Dict],
    top_reaction: str,
    max_sample: int = 10
) -> str:
    """
    Use Claude to read sample FAERS narratives and summarize the pattern.

    Args:
        drug_a: First drug name
        drug_b: Second drug name
        flagged_reports: List of FAERS reports with this drug combo
        top_reaction: The most common flagged reaction
        max_sample: Max reports to include (too many = expensive)

    Returns:
        Plain-language summary of what patients experienced
    """

    # Build sample narratives
    report_summaries = []
    for report in flagged_reports[:max_sample]:
        patient = report.get("patient", {})

        # Get reactions
        reactions = patient.get("reaction", [])
        if isinstance(reactions, dict):
            reactions = [reactions]
        reaction_terms = [r.get("reactionmeddrapt", "Unknown") for r in reactions]

        # Get basic demographics
        age = patient.get("patientonsetage", "Unknown age")
        sex_code = patient.get("patientsex")
        sex_map = {1: "Male", 2: "Female"}
        sex = sex_map.get(sex_code, "Unknown sex")

        report_summaries.append(
            f"Patient {age}, {sex}: Reactions = {', '.join(reaction_terms)}"
        )

    report_text = "\n".join(report_summaries)

    prompt = f"""You are analyzing real FDA adverse event reports (FAERS database) for patients taking both {drug_a} and {drug_b}.

The statistical analysis flagged "{top_reaction}" as occurring more often in this combination than expected.

Here are {len(report_summaries)} sample real patient cases:
{report_text}

Please summarize in plain language (suitable for a doctor to understand):
1. What pattern do you see across these cases?
2. When did the reaction typically start (if timing is mentioned)?
3. How severe does the reaction appear to be?
4. Does this look like a consistent pattern or scattered cases?

Be honest about data limitations. Do NOT invent details that aren't present in the sample.

Keep your response to 3-4 sentences maximum."""

    try:
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=300,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
    except Exception as e:
        capture_exception(
            e,
            service="claude",
            function="summarize_narrative_pattern",
            drug_a=drug_a,
            drug_b=drug_b,
            top_reaction=top_reaction,
        )
        raise

    return message.content[0].text


def generate_clinical_note(
    drug_a: str,
    drug_b: str,
    combo_total: int,
    top_signals: List[Dict],
    narrative_summary: str,
    patient_age: int = None,
    patient_sex: str = None,
    patient_conditions: List[str] = None
) -> str:
    """
    Generate a clinical documentation note for the doctor's records.

    Args:
        drug_a: First drug
        drug_b: Second drug
        combo_total: Total reports of this combination
        top_signals: List of flagged reactions with PRR data
        narrative_summary: Claude's summary of patient patterns
        patient_age: Doctor's patient age (optional)
        patient_sex: Doctor's patient sex (optional)
        patient_conditions: Doctor's patient conditions (optional)

    Returns:
        Professional clinical note suitable for EHR/chart
    """

    # Format patient context
    patient_context = ""
    if patient_age or patient_sex or patient_conditions:
        patient_parts = []
        if patient_age:
            patient_parts.append(f"{patient_age}yo")
        if patient_sex:
            patient_parts.append(f"{patient_sex}")
        if patient_conditions:
            patient_parts.append(f"with {', '.join(patient_conditions[:2])}")
        patient_context = f" ({', '.join(patient_parts)})" if patient_parts else ""

    # Format top signals
    top_reaction = top_signals[0]["reaction"] if top_signals else "adverse events"
    prr_vs_a = top_signals[0]["prr_vs_drug_a"] if top_signals else "N/A"
    prr_vs_b = top_signals[0]["prr_vs_drug_b"] if top_signals else "N/A"

    prompt = f"""Generate a brief clinical documentation note for a doctor's patient chart.

This note documents a drug interaction review that was conducted.

Information:
- Drugs reviewed: {drug_a} + {drug_b}
- Total FAERS reports: {combo_total}
- Top flagged reaction: {top_reaction}
- PRR vs {drug_a} alone: {prr_vs_a}
- PRR vs {drug_b} alone: {prr_vs_b}
- Patient{patient_context}
- Patient pattern summary: {narrative_summary}

Write a professional, factual note (2-3 sentences) suitable for inclusion in a medical record.

Format:
- Start with "Drug interaction check conducted [drugs reviewed]"
- Include the FAERS findings (report count, flagged reaction, PRR values)
- Note the data source (FDA FAERS)
- End with "Clinical judgment and patient assessment required"
- Do NOT recommend stopping the drugs - only document what was reviewed
- Keep it factual, not interpretive

Example: Drug interaction review conducted. Reviewed {drug_a} and {drug_b} combination against FDA FAERS database. Found {combo_total} co-reports with elevated signal for {top_reaction}. Data source: FDA FAERS via openFDA API. Clinical judgment required for treatment decisions.

Generate the note now:"""

    try:
        message = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=250,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        )
    except Exception as e:
        capture_exception(
            e,
            service="claude",
            function="generate_clinical_note",
            drug_a=drug_a,
            drug_b=drug_b,
            combo_total=combo_total,
        )
        raise

    return message.content[0].text
