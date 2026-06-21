"""
PART 4b: Document Parser Service

Extracts text from patient reports and prescriptions using Claude AI
to parse structured patient data.
"""

import json
import os
from typing import Dict, Any
from anthropic import Anthropic
from dotenv import load_dotenv
from sentry_utils import capture_exception

# Load environment variables
load_dotenv()

# Create Anthropic client with explicit API key
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
client = Anthropic(api_key=ANTHROPIC_API_KEY)


def extract_text_from_file(file_path: str) -> str:
    """Extract text from PDF or text file."""
    print(f"📂 Extracting text from: {file_path}")

    try:
        # Try to read as text first (works for .txt files)
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()
                if text and len(text.strip()) > 0:
                    print(f"✅ Successfully read as text file: {len(text)} chars")
                    return text
        except (UnicodeDecodeError, FileNotFoundError):
            pass

        # If text failed, try PDF
        if file_path.endswith('.pdf') or file_path.endswith('.PDF'):
            try:
                import PyPDF2
                with open(file_path, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    text = ''
                    for page in reader.pages:
                        text += page.extract_text()
                print(f"✅ Successfully read as PDF: {len(text)} chars")
                return text
            except ImportError:
                return f"[PDF detected but PyPDF2 not installed]"
            except Exception as pdf_error:
                print(f"⚠️  PDF parsing failed: {pdf_error}")
                capture_exception(
                    pdf_error,
                    service="document_parser",
                    function="extract_text_from_file",
                    file_type="pdf",
                )
                return f"[PDF parsing failed: {str(pdf_error)}]"

        # If still here, file is unreadable
        return f"[File cannot be read as text or PDF]"

    except Exception as e:
        print(f"❌ Fatal error reading file: {e}")
        capture_exception(
            e,
            service="document_parser",
            function="extract_text_from_file",
        )
        return f"[Error reading file: {str(e)}]"


def clean_drug_name(drug_str: str) -> str:
    """Remove dosage, frequency, and extra info from drug name."""
    if not drug_str:
        return drug_str

    drug_str = drug_str.strip()

    # Common patterns to remove: mg, dose, frequency, brand info
    import re
    # Remove anything after common dose indicators
    drug_str = re.split(r'\s+(\d+\s*(mg|ml|mcg|g|iu)|once|twice|daily|bd|tid|qid|per|for|to|in|at)', drug_str, maxsplit=1)[0]
    drug_str = drug_str.strip()

    # Remove brand names in parentheses
    drug_str = re.sub(r'\s*\([^)]*\)', '', drug_str)
    drug_str = drug_str.strip()

    return drug_str


def parse_patient_data_with_claude(
    patient_report_text: str,
    prescription_text: str
) -> Dict[str, Any]:
    """
    Use Claude to extract structured patient data from documents.

    Returns:
    {
        "extracted_data": {
            "patient_age": int or None,
            "patient_sex": str ("Male", "Female", "Other"),
            "patient_conditions": [list of conditions],
            "patient_current_meds": [list of medications],
            "proposed_drug": str,
            "illness_indication": str
        },
        "confidence": float (0.0-1.0),
        "extraction_notes": str
    }
    """

    # Check if Claude API key is available
    if not ANTHROPIC_API_KEY or ANTHROPIC_API_KEY == "your_anthropic_api_key_here" or ANTHROPIC_API_KEY.startswith("your"):
        print("⚠️  No valid Claude API key found - using mock data for demo")
        return get_mock_patient_data()

    prompt = f"""
You are a medical document parser. Extract structured patient information from the provided documents.

PATIENT MEDICAL REPORT:
---
{patient_report_text[:3000]}
---

PROPOSED PRESCRIPTION:
---
{prescription_text[:3000]}
---

Extract ONLY the following fields from these documents. Be precise:

1. patient_age: Integer (extract from report if available, null if not found)
2. patient_sex: "Male", "Female", or "Other" (or null)
3. patient_conditions: List of medical conditions the patient has
4. patient_current_meds: DRUG NAMES ONLY - Extract JUST the medication name, strip doses/frequency
   Examples: "Warfarin 5mg daily" → "Warfarin" | "Metoprolol 50mg twice daily" → "Metoprolol"
5. proposed_drug: DRUG NAME ONLY - The name of the NEW drug being prescribed (no dose)
6. illness_indication: The medical reason/illness the proposed drug treats

Return ONLY valid JSON (no markdown, no code blocks):
{{
    "patient_age": 65,
    "patient_sex": "Male",
    "patient_conditions": ["Atrial fibrillation", "Hypertension"],
    "patient_current_meds": ["Warfarin", "Metoprolol"],
    "proposed_drug": "Ibuprofen",
    "illness_indication": "Back pain",
    "confidence": 0.95,
    "notes": "Age and conditions clearly documented. Medication list complete."
}}

CRITICAL: For patient_current_meds and proposed_drug, extract ONLY THE DRUG NAME.
  - Do NOT include mg/dosage
  - Do NOT include frequency (daily, twice daily, etc)
  - Do NOT include brand names - use generic names
  - Examples: "Coumadin" → "Warfarin" | "Norvasc" → "Amlodipine"

If a field is not found, use null. Include a confidence score (0.0-1.0) indicating
how confident you are in the extraction. Add notes about what was found/missing.
"""

    try:
        response = client.messages.create(
            model="claude-opus-4-7",
            max_tokens=500,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = response.content[0].text.strip()

        # Parse JSON response
        extracted = json.loads(response_text)

        # Clean drug names (remove doses, frequencies, brand names)
        current_meds_clean = [clean_drug_name(med) for med in extracted.get("patient_current_meds", [])]
        proposed_drug_clean = clean_drug_name(extracted.get("proposed_drug", ""))

        return {
            "extracted_data": {
                "patient_age": extracted.get("patient_age"),
                "patient_sex": extracted.get("patient_sex"),
                "patient_conditions": extracted.get("patient_conditions", []),
                "patient_current_meds": current_meds_clean,
                "proposed_drug": proposed_drug_clean,
                "illness_indication": extracted.get("illness_indication")
            },
            "confidence": extracted.get("confidence", 0.0),
            "notes": extracted.get("notes", "")
        }

    except json.JSONDecodeError as e:
        print(f"⚠️  Claude JSON parse error: {e}")
        capture_exception(
            e,
            service="document_parser",
            function="parse_patient_data_with_claude",
            failure_type="invalid_json",
        )
        return get_mock_patient_data()
    except Exception as e:
        print(f"⚠️  Claude API error: {e}")
        capture_exception(
            e,
            service="document_parser",
            function="parse_patient_data_with_claude",
            failure_type="claude_api",
        )
        # Fall back to mock data if Claude fails
        return get_mock_patient_data()


def get_mock_patient_data() -> Dict[str, Any]:
    """
    Returns mock data for demo purposes.
    This simulates what would be extracted from a real patient report.
    """
    return {
        "extracted_data": {
            "patient_age": 67,
            "patient_sex": "Male",
            "patient_conditions": ["Atrial fibrillation", "Hypertension", "Type 2 Diabetes"],
            "patient_current_meds": ["Warfarin", "Metoprolol", "Lisinopril", "Metformin"],
            "proposed_drug": "Ibuprofen",
            "illness_indication": "Lower back pain from degenerative disc disease"
        },
        "confidence": 1.0,
        "notes": "Mock data for hackathon demo - represents typical elderly patient with AFib on anticoagulation being prescribed NSAID for pain"
    }
