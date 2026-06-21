"""
PART 3: Patient Similarity Scorer

Compares the doctor's patient against real FAERS cases to find
similar patients who experienced adverse events.

Uses explainable, weighted scoring (not ML black-box):
  - Age proximity (±5 years = high match)
  - Sex match (exact = 100%, mismatch = 0%)
  - Medical condition overlap
  - Current medication overlap

Returns top 3-5 most similar cases with:
  - Similarity score (0-100%)
  - What reaction they experienced
  - FAERS report ID (for auditing)
  - Timing (days to onset)
"""

import logging
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)


def calculate_age_similarity(patient_age: int, case_age: int) -> float:
    """
    Calculate age similarity score (0-1).

    Scoring:
    - Exact match or ±1 year: 1.0 (100%)
    - ±2-5 years: 0.8-0.95
    - ±6-10 years: 0.5-0.7
    - ±11+ years: 0.0-0.4
    """
    if patient_age is None or case_age is None:
        return 0.5  # Neutral if not provided

    # Convert both to int (FAERS returns age as string)
    try:
        patient_age_int = int(patient_age) if isinstance(patient_age, str) else patient_age
        case_age_int = int(case_age) if isinstance(case_age, str) else case_age
    except (ValueError, TypeError):
        return 0.5

    age_diff = abs(patient_age_int - case_age_int)

    if age_diff <= 1:
        return 1.0
    elif age_diff <= 5:
        return 0.95 - (age_diff - 1) * 0.03
    elif age_diff <= 10:
        return 0.8 - (age_diff - 5) * 0.06
    else:
        return max(0.0, 0.5 - (age_diff - 10) * 0.02)


def calculate_sex_similarity(patient_sex: Optional[str], case_sex: Optional[str]) -> float:
    """
    Calculate sex similarity score.

    Scoring:
    - Match: 1.0 (100%)
    - Mismatch: 0.0
    - Either missing: 0.5 (neutral)

    Handles:
    - Patient sex: "Male", "Female", "Other" (strings)
    - FAERS sex: "1" (Male), "2" (Female), "M", "F" (codes)
    """
    if patient_sex is None or case_sex is None:
        return 0.5

    # Normalize patient sex
    patient_sex_normalized = patient_sex.upper()[0] if patient_sex else None

    # Normalize case sex (handle FAERS codes)
    case_sex_str = str(case_sex).strip().upper()
    if case_sex_str in ('1', 'M'):
        case_sex_normalized = 'M'
    elif case_sex_str in ('2', 'F'):
        case_sex_normalized = 'F'
    elif case_sex_str in ('OTHER', 'O'):
        case_sex_normalized = 'O'
    else:
        case_sex_normalized = case_sex_str[0] if case_sex_str else None

    if patient_sex_normalized and case_sex_normalized:
        if patient_sex_normalized == case_sex_normalized:
            return 1.0
        return 0.0

    return 0.5


def calculate_condition_overlap(
    patient_conditions: List[str],
    case_indications: List[str]
) -> float:
    """
    Calculate condition/indication overlap.

    IMPORTANT: FAERS data doesn't reliably store patient conditions,
    only drug indications which are often empty or generic.
    This function tries to match but gracefully handles missing data.

    Scoring:
    - # matching conditions / max(patient conditions, case indications)
    - E.g., patient has [HTN, DM], case has [HTN, stroke] = 1/2 = 0.5 (50%)
    - If case has no useful indications → return 0.5 (neutral, don't penalize)
    """
    if not patient_conditions:
        return 0.6  # No patient conditions provided - slightly favor neutral (FAERS often lacks this)

    if not case_indications:
        return 0.6  # Case has no indications (common in FAERS) - neutral, don't penalize

    # Filter out generic/useless indications
    useful_indications = [
        i for i in case_indications
        if i and 'unknown' not in i.lower() and len(i.strip()) > 3
    ]

    if not useful_indications:
        return 0.5  # No useful indications in case - neutral, don't penalize

    # Convert to lowercase for comparison
    patient_conds = [c.lower().strip() for c in patient_conditions]
    case_inds = [i.lower().strip() for i in useful_indications]

    # Find overlaps
    matches = len(set(patient_conds) & set(case_inds))

    # Denominator: use larger set for stricter matching
    denominator = max(len(patient_conds), len(case_inds))

    if denominator == 0:
        return 0.5

    return matches / denominator


def calculate_medication_overlap(
    patient_meds: List[str],
    case_meds: List[str]
) -> float:
    """
    Calculate medication overlap.

    Scoring: # of patient's current meds that appear in case / total patient meds
    E.g., patient on [Warfarin, Metoprolol, Lisinopril], case has [Warfarin, Atorvastatin]
    = 1/3 = 0.33 (33%)
    """
    if not patient_meds or not case_meds:
        return 0.5  # Neutral if not provided

    # Convert to lowercase for comparison
    patient_meds_lower = [m.lower().strip() for m in patient_meds]
    case_meds_lower = [m.lower().strip() for m in case_meds]

    # Find overlaps
    matches = len(set(patient_meds_lower) & set(case_meds_lower))

    if len(patient_meds) == 0:
        return 0.5

    return matches / len(patient_meds)


def calculate_overall_similarity(
    patient_age: Optional[int],
    patient_sex: Optional[str],
    patient_conditions: Optional[List[str]],
    patient_current_meds: Optional[List[str]],
    case_age: Optional[int],
    case_sex: Optional[str],
    case_indications: Optional[List[str]],
    case_meds: Optional[List[str]]
) -> float:
    """
    Calculate overall similarity score (0-100%).

    FAERS-optimized weighted components:
    - Age: 20% (converted from string to int for comparison)
    - Sex: 15% (converted from code 1/2 to M/F)
    - Conditions/Indications: 20% (FAERS often lacks this, uses neutral 0.5 if missing)
    - Current Medications: 45% (most reliable field in FAERS data)

    Increased med weight because FAERS consistently has drug names,
    but inconsistently has patient conditions/indications.
    """
    age_score = calculate_age_similarity(patient_age, case_age)
    sex_score = calculate_sex_similarity(patient_sex, case_sex)
    condition_score = calculate_condition_overlap(patient_conditions or [], case_indications or [])
    med_score = calculate_medication_overlap(patient_current_meds or [], case_meds or [])

    print(f"[SIMILARITY DEBUG] age={age_score:.2f} sex={sex_score:.2f} cond={condition_score:.2f} meds={med_score:.2f}")

    # Weighted average (adjusted for FAERS data reliability)
    overall = (
        age_score * 0.20 +
        sex_score * 0.15 +
        condition_score * 0.20 +
        med_score * 0.45
    )

    return overall * 100  # Convert to percentage


def extract_case_info(faers_report: Dict) -> Dict:
    """
    Extract relevant fields from a FAERS report.

    Returns: {
        'age': int or None,
        'sex': str or None,  # 1=Male, 2=Female
        'indications': [list of conditions],
        'medications': [list of drugs],
        'reactions': [list of adverse events],
        'days_to_onset': int or None,
        'safetyreportid': str
    }
    """
    patient = faers_report.get("patient", {})

    # Extract age
    age = patient.get("patientonsetage")

    # Extract sex (1=Male, 2=Female in FAERS)
    sex_code = patient.get("patientsex")
    sex_map = {1: "M", 2: "F"}
    sex = sex_map.get(sex_code)

    # Extract indications (why the patient was taking the drug)
    indications = []
    drugs = patient.get("drug", [])
    if isinstance(drugs, dict):
        drugs = [drugs]
    for drug in drugs:
        indication = drug.get("drugindication", "")
        if indication:
            indications.append(indication)

    # Extract medications
    medications = []
    for drug in drugs:
        med_name = drug.get("medicinalproduct", "")
        if med_name:
            medications.append(med_name)

    # Extract reactions
    reactions = []
    reaction_list = patient.get("reaction", [])
    if isinstance(reaction_list, dict):
        reaction_list = [reaction_list]
    for reaction in reaction_list:
        reaction_term = reaction.get("reactionmeddrapt", "")
        if reaction_term:
            reactions.append(reaction_term)

    # Extract days to onset (reporterscholars_initiation_date vs receivedate)
    days_to_onset = None
    if "reaction" in patient:
        reaction_obj = patient["reaction"]
        if isinstance(reaction_obj, list) and len(reaction_obj) > 0:
            days_to_onset = reaction_obj[0].get("reactionmeddradurationvalue")

    # Report ID
    report_id = faers_report.get("safetyreportid", "Unknown")

    # Debug: log what keys are in the report
    if report_id == "Unknown":
        available_keys = list(faers_report.keys())[:10]
        logger.warning(f"No safetyreportid found. Available keys: {available_keys}")

    return {
        "age": age,
        "sex": sex,
        "indications": indications,
        "medications": medications,
        "reactions": reactions,
        "days_to_onset": days_to_onset,
        "safetyreportid": report_id
    }


def find_similar_cases(
    patient_age: Optional[int],
    patient_sex: Optional[str],
    patient_conditions: Optional[List[str]],
    patient_current_meds: Optional[List[str]],
    faers_reports: List[Dict],
    top_n: int = 5,
    min_similarity: float = 0.2  # Lowered from 0.3 to get more results with limited FAERS data
) -> List[Dict]:
    """
    Find most similar patients in FAERS reports.

    Args:
        patient_age: Doctor's patient age
        patient_sex: Doctor's patient sex ("M" or "F")
        patient_conditions: List of patient's medical conditions
        patient_current_meds: List of patient's current medications
        faers_reports: List of FAERS reports to search
        top_n: Return top N most similar cases (default 5)
        min_similarity: Only return cases with similarity >= this (0.0-1.0)

    Returns:
        List of dicts, each with:
        {
            "similarity_score": float (0-100),
            "reason": str (explanation of similarity),
            "reaction": str (what happened to this patient),
            "safetyreportid": str,
            "days_to_onset": int or None,
            "case_age": int or None,
            "case_sex": str or None
        }
    """
    scored_cases = []

    for report in faers_reports:
        case_info = extract_case_info(report)

        # Skip if case has no useful info
        if not case_info["medications"] or not case_info["reactions"]:
            continue

        # Calculate similarity
        similarity = calculate_overall_similarity(
            patient_age,
            patient_sex,
            patient_conditions,
            patient_current_meds,
            case_info["age"],
            case_info["sex"],
            case_info["indications"],
            case_info["medications"]
        )

        # Only include if meets minimum threshold
        if similarity < (min_similarity * 100):
            continue

        # Build reason string
        reasons = []
        if patient_age and case_info["age"]:
            try:
                case_age_int = int(case_info["age"]) if isinstance(case_info["age"], str) else case_info["age"]
                age_diff = abs(patient_age - case_age_int)
                reasons.append(f"Age {case_age_int} (±{age_diff} yrs)")
            except (ValueError, TypeError):
                pass

        if patient_sex and case_info["sex"]:
            if patient_sex.upper() == case_info["sex"]:
                reasons.append(f"Same sex: {case_info['sex']}")
            else:
                reasons.append(f"Different sex")

        if patient_conditions and case_info["indications"]:
            matching_conds = set(c.lower() for c in patient_conditions) & set(i.lower() for i in case_info["indications"])
            if matching_conds:
                reasons.append(f"Shared condition: {', '.join(list(matching_conds)[:2])}")

        if patient_current_meds and case_info["medications"]:
            matching_meds = set(m.lower() for m in patient_current_meds) & set(med.lower() for med in case_info["medications"])
            if matching_meds:
                reasons.append(f"Also on: {', '.join(list(matching_meds)[:2])}")

        reason = " • ".join(reasons) if reasons else "Limited demographic match"

        scored_cases.append({
            "similarity_score": round(similarity, 1),
            "reason": reason,
            "reaction": case_info["reactions"][0] if case_info["reactions"] else "Unknown",
            "safetyreportid": case_info["safetyreportid"],
            "days_to_onset": case_info["days_to_onset"],
            "case_age": case_info["age"],
            "case_sex": case_info["sex"]
        })

    # Sort by similarity descending
    scored_cases.sort(key=lambda x: x["similarity_score"], reverse=True)

    # Get top N
    top_cases = scored_cases[:top_n]

    # Log the top cases selected
    logger.info(f"\n{'='*80}")
    logger.info(f"SIMILAR CASES ANALYSIS - TOP {len(top_cases)} MATCHES SELECTED")
    logger.info(f"{'='*80}")
    for i, case in enumerate(top_cases, 1):
        logger.info(f"\nCase #{i}: {case['similarity_score']}% Match")
        logger.info(f"  Reaction: {case['reaction']}")
        logger.info(f"  Reason: {case['reason']}")
        logger.info(f"  Report ID: {case['safetyreportid']}")
        logger.info(f"  Patient Age: {case['case_age']}, Sex: {case['case_sex']}")
    logger.info(f"{'='*80}\n")

    return top_cases
