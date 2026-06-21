"""
PART 1: openFDA Query Service

Queries the openFDA Drug Adverse Event API for:
- Drug A + Drug B reports (combination)
- Drug A alone (baseline)
- Drug B alone (baseline)

Returns structured data with reaction counts for downstream processing.

API Docs: https://open.fda.gov/apis/drug/event/
"""

import httpx
import os
from typing import Dict, List

BASE_URL = "https://api.fda.gov/drug/event.json"
OPENFDA_API_KEY = os.getenv("OPENFDA_API_KEY", "")


async def query_openfda(
    drug_name: str,
    additional_filter: str = "",
    limit: int = 100
) -> Dict:
    """
    Query openFDA for adverse events.

    Args:
        drug_name: Drug to search for (e.g., "Warfarin")
        additional_filter: Additional search filter (e.g., another drug)
        limit: Max results to return

    Returns:
        Raw API response with results list
    """
    # Build search query
    search_term = f'patient.drug.medicinalproduct:"{drug_name.upper()}"'
    if additional_filter:
        search_term += f" AND {additional_filter}"

    params = {
        "search": search_term,
        "limit": limit
    }

    # Add API key if available (improves rate limits)
    if OPENFDA_API_KEY:
        params["api_key"] = OPENFDA_API_KEY

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"❌ openFDA query error for '{drug_name}': {e}")
        return {"results": [], "error": str(e)}


def extract_reaction_counts(api_response: Dict) -> Dict[str, int]:
    """
    Extract reaction counts from openFDA response.

    Args:
        api_response: Raw API response

    Returns:
        Dict of {reaction_term: count}

    Note: FAERS uses MedDRA reaction terms (reactionmeddrapt)
    """
    reaction_counts = {}

    for result in api_response.get("results", []):
        reactions = result.get("patient", {}).get("reaction", [])

        # Handle case where reactions is a dict vs list
        if isinstance(reactions, dict):
            reactions = [reactions]

        for reaction in reactions:
            term = reaction.get("reactionmeddrapt", "Unknown")
            reaction_counts[term] = reaction_counts.get(term, 0) + 1

    return reaction_counts


async def fetch_report_by_id(report_id: str) -> Dict:
    """
    Fetch a specific FAERS report by safetyreportid.

    Args:
        report_id: FDA safetyreportid (e.g., "10285688")

    Returns:
        Report details if found, empty dict otherwise
    """
    search_term = f'safetyreportid:"{report_id}"'
    params = {
        "search": search_term,
        "limit": 1
    }

    if OPENFDA_API_KEY:
        params["api_key"] = OPENFDA_API_KEY

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            return results[0] if results else {}
    except Exception as e:
        print(f"❌ openFDA report fetch error for ID '{report_id}': {e}")
        return {}


async def check_drug_combination(
    drug_a: str,
    drug_b: str
) -> Dict:
    """
    Main entry point: Query openFDA for a drug combination.

    Performs 3 parallel queries:
    1. Drug A + Drug B together
    2. Drug A alone
    3. Drug B alone

    Args:
        drug_a: First drug (e.g., "Warfarin")
        drug_b: Second drug (e.g., "Ibuprofen")

    Returns:
        {
            "combo_reports": [...],
            "drug_a_reports": [...],
            "drug_b_reports": [...],
            "combo_total": int,
            "drug_a_total": int,
            "drug_b_total": int,
            "combo_reactions": {...},
            "drug_a_reactions": {...},
            "drug_b_reactions": {...}
        }
    """

    # Query for combination (both drugs together)
    combo_filter = f'patient.drug.medicinalproduct:"{drug_b.upper()}"'
    combo_data = await query_openfda(drug_a, additional_filter=combo_filter)

    # Query for Drug A alone
    drug_a_data = await query_openfda(drug_a)

    # Query for Drug B alone
    drug_b_data = await query_openfda(drug_b)

    # Extract metadata
    combo_total = combo_data.get("meta", {}).get("results", {}).get("total", 0)
    drug_a_total = drug_a_data.get("meta", {}).get("results", {}).get("total", 0)
    drug_b_total = drug_b_data.get("meta", {}).get("results", {}).get("total", 0)

    # Extract reaction counts
    combo_reactions = extract_reaction_counts(combo_data)
    drug_a_reactions = extract_reaction_counts(drug_a_data)
    drug_b_reactions = extract_reaction_counts(drug_b_data)

    return {
        "combo_reports": combo_data.get("results", []),
        "drug_a_reports": drug_a_data.get("results", []),
        "drug_b_reports": drug_b_data.get("results", []),
        "combo_total": combo_total,
        "drug_a_total": drug_a_total,
        "drug_b_total": drug_b_total,
        "combo_reactions": combo_reactions,
        "drug_a_reactions": drug_a_reactions,
        "drug_b_reactions": drug_b_reactions
    }
