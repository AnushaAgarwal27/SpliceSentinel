import httpx
import sqlite3
import json
from datetime import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from anthropic import Anthropic
import phoenix as px
from openinference.instrumentation.anthropic import AnthropicInstrumentor

# Initialize Arize Phoenix tracing
px.launch_app()
AnthropicInstrumentor().instrument()

app = FastAPI()

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database
def init_db():
    conn = sqlite3.connect("drug_checks.db")
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS checks (
            id INTEGER PRIMARY KEY,
            drug_a TEXT,
            drug_b TEXT,
            patient_age INTEGER,
            patient_conditions TEXT,
            report_count INTEGER,
            top_reactions TEXT,
            risk_flag TEXT,
            narrative_summary TEXT,
            patient_similarity TEXT,
            generated_note TEXT,
            created_at TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# OpenFDA API queries
OPENFDA_BASE = "https://api.fda.gov/drug/event.json"

def query_openfda(drug_name: str, additional_filter: str = "") -> dict:
    """Query openFDA for adverse events"""
    search_term = f'patient.drug.medicinalproduct:"{drug_name.upper()}"'
    if additional_filter:
        search_term += f" AND {additional_filter}"

    params = {
        "search": search_term,
        "limit": 100
    }

    try:
        response = httpx.get(OPENFDA_BASE, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"OpenFDA query error: {e}")
        return {}

def compute_prr(combo_reports: list, drug_a_reports: list, drug_b_reports: list) -> dict:
    """
    Simplified PRR (Proportional Reporting Ratio) calculation.
    Returns elevated signal reactions.
    """
    # Extract reactions from combination reports
    combo_reactions = {}
    for report in combo_reports:
        if "patient" in report and "reaction" in report["patient"]:
            reactions = report["patient"]["reaction"]
            if not isinstance(reactions, list):
                reactions = [reactions]
            for reaction in reactions:
                term = reaction.get("reactionmeddrapt", "Unknown")
                combo_reactions[term] = combo_reactions.get(term, 0) + 1

    # Extract reactions from single-drug reports
    drug_a_reactions = {}
    for report in drug_a_reports:
        if "patient" in report and "reaction" in report["patient"]:
            reactions = report["patient"]["reaction"]
            if not isinstance(reactions, list):
                reactions = [reactions]
            for reaction in reactions:
                term = reaction.get("reactionmeddrapt", "Unknown")
                drug_a_reactions[term] = drug_a_reactions.get(term, 0) + 1

    drug_b_reactions = {}
    for report in drug_b_reports:
        if "patient" in report and "reaction" in report["patient"]:
            reactions = report["patient"]["reaction"]
            if not isinstance(reactions, list):
                reactions = [reactions]
            for reaction in reactions:
                term = reaction.get("reactionmeddrapt", "Unknown")
                drug_b_reactions[term] = drug_b_reactions.get(term, 0) + 1

    # Calculate PRR for top reactions
    elevated_reactions = {}
    combo_total = len(combo_reports) or 1
    drug_a_total = len(drug_a_reports) or 1
    drug_b_total = len(drug_b_reports) or 1

    for reaction, count in sorted(combo_reactions.items(), key=lambda x: x[1], reverse=True)[:10]:
        combo_rate = count / combo_total
        drug_a_rate = drug_a_reactions.get(reaction, 0) / drug_a_total
        drug_b_rate = drug_b_reactions.get(reaction, 0) / drug_b_total

        # If elevated in combo vs both individual drugs, flag it
        if combo_rate > max(drug_a_rate, drug_b_rate) * 1.5:
            prr = combo_rate / (max(drug_a_rate, drug_b_rate) or 0.001)
            elevated_reactions[reaction] = {
                "count": count,
                "prr": round(prr, 2),
                "rate_in_combo": round(combo_rate * 100, 1)
            }

    return {
        "elevated_reactions": elevated_reactions,
        "total_combo_reports": combo_total,
        "risk_level": "elevated" if len(elevated_reactions) > 0 else "no_notable_signal"
    }

def get_narrative_reports(drug_a: str, drug_b: str) -> list:
    """Fetch reports with narrative text for Claude analysis"""
    search_term = f'patient.drug.medicinalproduct:"{drug_a.upper()}" AND patient.drug.medicinalproduct:"{drug_b.upper()}"'
    params = {
        "search": search_term,
        "limit": 20
    }
    try:
        response = httpx.get(OPENFDA_BASE, params=params, timeout=10)
        data = response.json()
        # Filter for reports with narrative text
        narratives = []
        for report in data.get("results", []):
            if "safetyreporttext" in report:
                narratives.append({
                    "date": report.get("receivedate", "Unknown"),
                    "text": report["safetyreporttext"][:500],  # First 500 chars
                    "outcome": report.get("serious", [{}])[0].get("outcomecode", "Unknown") if report.get("serious") else "Unknown"
                })
        return narratives[:5]  # Return top 5
    except Exception as e:
        print(f"Error fetching narratives: {e}")
        return []

def generate_narrative_summary(drug_a: str, drug_b: str, narratives: list) -> str:
    """Use Claude to read narratives and summarize pattern"""
    client = Anthropic()

    narrative_text = "\n\n".join([
        f"Report {i+1} ({n['date']}):\n{n['text']}"
        for i, n in enumerate(narratives)
    ])

    prompt = f"""You are a pharmacovigilance analyst. Read these adverse event narratives from patients who took both {drug_a} and {drug_b} together.

{narrative_text}

Summarize in 2-3 sentences: what symptom or pattern emerges? How severe? How soon after starting? Be precise and cite what patients actually said.

Keep it plain language, suitable for a doctor to read."""

    message = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

def generate_clinical_note(drug_a: str, drug_b: str, risk_level: str, summary: str, report_count: int, patient_age: int = None, patient_conditions: str = None) -> str:
    """Generate a clinical note for the doctor"""
    client = Anthropic()

    patient_context = ""
    if patient_age and patient_conditions:
        patient_context = f"\nPatient profile: {patient_age}yo, {patient_conditions}."

    prompt = f"""You are a clinical documentation assistant. Generate a brief, doctor-ready documentation note for this drug interaction check.

Drugs checked: {drug_a} + {drug_b}
Risk level: {risk_level}
Reports in FAERS: {report_count}
Pattern from patient reports: {summary}{patient_context}

Write a short note (2-3 sentences) that a doctor can paste directly into their chart. Include: drug names, whether interaction is flagged, what patients reported, and any clinical consideration. Format it as a clinical note."""

    message = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=250,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

def analyze_patient_similarity(drug_a: str, drug_b: str, patient_age: int, patient_conditions: str, narratives: list) -> str:
    """Use Claude to compare patient against FAERS cases"""
    client = Anthropic()

    narrative_text = "\n\n".join([
        f"Case {i+1}: {n['text']}"
        for i, n in enumerate(narratives)
    ])

    prompt = f"""You are analyzing whether a specific patient resembles the people who had bad reactions to {drug_a} + {drug_b}.

Patient profile:
- Age: {patient_age}
- Conditions: {patient_conditions}

Real adverse event cases from FAERS:
{narrative_text}

Compare: Does this patient resemble the people who had bad reactions?
- What features match (age, conditions mentioned)?
- What features differ?
- Overall: HIGH, MODERATE, or LOW similarity to the at-risk group?

Be specific. Format: "Similarity: [HIGH/MOD/LOW] because..."
"""

    message = client.messages.create(
        model="claude-opus-4-1-20250805",
        max_tokens=200,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text

# API Endpoints
@app.post("/check-combination")
async def check_combination(drug_a: str, drug_b: str, patient_age: int = None, patient_conditions: str = None):
    """Main endpoint: check drug combination against FDA data"""

    print(f"Checking: {drug_a} + {drug_b}")

    # Query openFDA
    combo_data = query_openfda(drug_a, f'patient.drug.medicinalproduct:"{drug_b.upper()}"')
    drug_a_data = query_openfda(drug_a)
    drug_b_data = query_openfda(drug_b)

    combo_reports = combo_data.get("results", [])
    drug_a_reports = drug_a_data.get("results", [])
    drug_b_reports = drug_b_data.get("results", [])

    # Compute PRR signal
    signal = compute_prr(combo_reports, drug_a_reports, drug_b_reports)

    # Get narratives and summarize with Claude
    narratives = get_narrative_reports(drug_a, drug_b)
    narrative_summary = ""
    if narratives:
        narrative_summary = generate_narrative_summary(drug_a, drug_b, narratives)
    else:
        narrative_summary = "Insufficient narrative data available for this combination."

    # Generate clinical note
    generated_note = generate_clinical_note(
        drug_a, drug_b, signal["risk_level"], narrative_summary,
        signal["total_combo_reports"], patient_age, patient_conditions
    )

    # Analyze patient similarity if patient data provided
    patient_similarity = ""
    if patient_age and patient_conditions and narratives:
        patient_similarity = analyze_patient_similarity(drug_a, drug_b, patient_age, patient_conditions, narratives)

    # Store in database
    conn = sqlite3.connect("drug_checks.db")
    c = conn.cursor()
    c.execute("""
        INSERT INTO checks
        (drug_a, drug_b, patient_age, patient_conditions, report_count,
         top_reactions, risk_flag, narrative_summary, patient_similarity, generated_note, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        drug_a, drug_b, patient_age, patient_conditions,
        signal["total_combo_reports"],
        json.dumps(signal["elevated_reactions"]),
        signal["risk_level"],
        narrative_summary,
        patient_similarity,
        generated_note,
        datetime.now()
    ))
    conn.commit()
    conn.close()

    return {
        "drug_a": drug_a,
        "drug_b": drug_b,
        "risk_level": signal["risk_level"],
        "total_reports": signal["total_combo_reports"],
        "elevated_reactions": signal["elevated_reactions"],
        "narrative_summary": narrative_summary,
        "patient_similarity": patient_similarity,
        "generated_note": generated_note
    }

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
