"""
Drug Interaction Checker - FastAPI Backend

A hackathon tool for doctors to check if a drug combination is dangerous
for a specific patient, using real FDA adverse event data.

Architecture:
  PART 1: openFDA query service
  PART 2: Signal detection (PRR)
  PART 3: Patient similarity scorer
  PART 4: Claude narrative + note generation
  PART 5: Confidence handling
  PART 6: Arize Phoenix observability
  PART 7: FastAPI endpoints

Run:
  uvicorn app:app --reload --host 0.0.0.0 --port 8000
"""

# ============================================================================
# PART 6: Initialize Phoenix tracing FIRST (before importing services)
# Using OpenTelemetry directly for Phoenix Cloud (avoids hdbscan dependency)
# ============================================================================
import os
import sys
from dotenv import load_dotenv

load_dotenv()

from sentry_utils import capture_exception, init_sentry, track_operation

init_sentry()

# ============================================================================
# Now import services (they will use instrumented Anthropic)
# ============================================================================
from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import tempfile
import json
from datetime import datetime

from config import ANTHROPIC_API_KEY, HOST, PORT, PRR_THRESHOLD
from services.openfda_service import check_drug_combination
from services.signal_detection import find_elevated_signals, calculate_data_confidence
from services.similarity_scorer import find_similar_cases
from services.claude_service import summarize_narrative_pattern, generate_clinical_note
from services.document_parser import parse_patient_data_with_claude, get_mock_patient_data
from data_store import store_query_result, get_trending_signals, get_combo_history, get_new_signals_since

# Initialize FastAPI app
app = FastAPI(
    title="Drug Interaction Checker",
    description="Real FDA adverse event data for drug combinations",
    version="1.0.0"
)

# CORS middleware for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Request/Response Models
# ============================================================================

class DrugCombinationRequest(BaseModel):
    """Input: Doctor's check request."""
    drug_a: str
    drug_b: Optional[str] = None  # Optional: if provided, use it; otherwise use patient_current_meds
    patient_age: Optional[int] = None
    patient_sex: Optional[str] = None  # "M", "F", or None
    patient_conditions: Optional[List[str]] = None
    patient_current_meds: Optional[List[str]] = None


class ReactionSignal(BaseModel):
    """A flagged reaction with PRR data."""
    reaction: str
    combo_count: int
    rate_in_combo: float
    prr_vs_drug_a: float
    prr_vs_drug_b: float


class SimilarCase(BaseModel):
    """A similar patient case from FAERS."""
    similarity_score: float
    reason: str
    reaction: str
    safetyreportid: str
    days_to_onset: Optional[int] = None
    case_age: Optional[int] = None
    case_sex: Optional[str] = None


class CheckResult(BaseModel):
    """Result of drug combination check (all PARTS combined)."""
    drug_a: str
    drug_b: str
    combo_total: int
    confidence: str
    confidence_message: str
    signals: List[ReactionSignal]
    similar_cases: List[SimilarCase] = []  # PART 3
    narrative_summary: str = ""  # PART 4
    clinical_note: str = ""  # PART 4


# ============================================================================
# Endpoints
# ============================================================================

@app.get("/health")
async def health():
    """Health check."""
    return {"status": "ok", "service": "drug-interaction-checker"}


@app.get("/debug/fda-raw/{drug_a}/{drug_b}")
async def debug_fda_raw(drug_a: str, drug_b: str):
    """Debug endpoint: Show raw FDA data for a drug combination."""
    try:
        data = await check_drug_combination(drug_a.upper(), drug_b.upper())
        return {
            "status": "success",
            "drug_a": drug_a,
            "drug_b": drug_b,
            "total_reports": data["combo_total"],
            "sample_reports": data["combo_reports"][:3] if data["combo_reports"] else [],
            "total_reactions_found": len(data["combo_reactions"]),
            "sample_reactions": list(data["combo_reactions"].keys())[:10],
            "raw_fda_response": data["combo_reports"][:1] if data["combo_reports"] else None,
            "note": "This is raw FDA FAERS data - real adverse event reports"
        }
    except Exception as e:
        capture_exception(e, endpoint="/debug/fda-raw", drug_a=drug_a, drug_b=drug_b)
        raise HTTPException(status_code=502, detail=f"FDA API error: {str(e)}")


@app.get("/debug/similar-cases/{drug_a}/{drug_b}")
async def debug_similar_cases(drug_a: str, drug_b: str):
    """Debug endpoint: Show how the top 5 similar cases were selected and scored."""
    try:
        data = await check_drug_combination(drug_a.upper(), drug_b.upper())
        similar_cases = data.get("similar_cases", [])

        return {
            "status": "success",
            "drug_combination": f"{drug_a.upper()} + {drug_b.upper()}",
            "total_reports_analyzed": data["combo_total"],
            "top_similar_cases_found": len(similar_cases),
            "similar_cases": [
                {
                    "rank": i + 1,
                    "similarity_score": case["similarity_score"],
                    "match_quality": "High" if case["similarity_score"] >= 50 else "Moderate" if case["similarity_score"] >= 40 else "Fair",
                    "reaction_reported": case["reaction"],
                    "why_similar": case["reason"],
                    "patient_age": case["case_age"],
                    "patient_sex": case["case_sex"],
                    "days_to_onset": case["days_to_onset"],
                    "fda_report_id": case["safetyreportid"],
                    "verifiable_at": f"https://fis.fda.gov/ (search Report ID: {case['safetyreportid']})"
                }
                for i, case in enumerate(similar_cases[:5])
            ],
            "scoring_methodology": {
                "age_proximity": "20% - Matches within ±5 years weighted heavily",
                "sex_match": "15% - Exact sex match receives full credit",
                "conditions_match": "20% - Overlap in patient conditions with case indications",
                "medications_match": "45% - Overlap in patient medications with case medications"
            },
            "total_possible_score": "100%",
            "minimum_threshold": "20% similarity to qualify as a match"
        }
    except Exception as e:
        capture_exception(e, endpoint="/debug/similar-cases", drug_a=drug_a, drug_b=drug_b)
        raise HTTPException(status_code=502, detail=f"Error retrieving similar cases: {str(e)}")


@app.get("/debug/sentry-test")
async def debug_sentry_test():
    """Trigger a test error so the Sentry dashboard can be verified."""
    try:
        raise RuntimeError("Sentry test error from Splice Sentinel backend")
    except Exception as e:
        capture_exception(e, endpoint="/debug/sentry-test")
        raise HTTPException(status_code=500, detail="Sentry test error captured")


@app.post("/api/extract-patient-data")
async def extract_patient_data(
    patient_report: List[UploadFile] = File(...),
    prescription: UploadFile = File(...)
):
    """
    Extract structured patient data from uploaded documents.

    Uses Claude AI to parse medical reports and prescriptions.
    """
    try:
        if not patient_report:
            raise HTTPException(status_code=400, detail="At least one patient report is required")

        # Save uploaded files temporarily with correct file extensions
        report_paths = []
        prescription_ext = os.path.splitext(prescription.filename)[1] or '.txt'

        for report in patient_report:
            report_ext = os.path.splitext(report.filename)[1] or '.txt'
            with tempfile.NamedTemporaryFile(delete=False, suffix=report_ext) as report_file:
                content = await report.read()
                report_file.write(content)
                report_file.flush()
                os.fsync(report_file.fileno())
                report_paths.append((report_file.name, report.filename or "patient_report", report_ext))

        with tempfile.NamedTemporaryFile(delete=False, suffix=prescription_ext) as prescription_file:
            content = await prescription.read()
            prescription_file.write(content)
            prescription_file.flush()
            os.fsync(prescription_file.fileno())
            prescription_path = prescription_file.name

        print(f"💾 Saved {len(report_paths)} patient report temp file(s), prescription: {prescription_path} ({prescription_ext})")

        # Extract text from files
        from services.document_parser import extract_text_from_file

        patient_report_sections = []
        for index, (report_path, original_name, _report_ext) in enumerate(report_paths, 1):
            report_text = extract_text_from_file(report_path)
            patient_report_sections.append(
                f"--- Patient report {index}: {original_name} ---\n{report_text}"
            )

        patient_report_text = "\n\n".join(patient_report_sections)
        prescription_text = extract_text_from_file(prescription_path)

        print(f"📄 Extracted {len(report_paths)} patient report(s): {len(patient_report_text)} chars total")
        print(f"📄 Extracted prescription: {len(prescription_text)} chars")

        # Parse with Claude
        parsed = parse_patient_data_with_claude(patient_report_text, prescription_text)

        # Clean up temp files
        for report_path, _original_name, _report_ext in report_paths:
            os.unlink(report_path)
        os.unlink(prescription_path)

        return {
            "status": "success",
            "patient_report_text": patient_report_text[:1000],  # First 1000 chars for verification
            "prescription_text": prescription_text[:1000],
            **parsed
        }

    except Exception as e:
        print(f"❌ Document extraction failed: {e}")
        capture_exception(e, endpoint="/api/extract-patient-data")
        raise HTTPException(status_code=400, detail=f"Failed to process documents: {str(e)}")


@app.post("/api/check-combination")
async def check_combination(request: DrugCombinationRequest) -> CheckResult:
    """
    Main endpoint: Check if a drug combination is dangerous.

    PART 1: Query openFDA for proposed drug vs each current medication
    PART 2: Calculate PRR signal for each combination
    PART 3: Find similar patient cases across all combinations
    PART 4: Claude narrative + note
    PART 5: Confidence assessment

    Returns aggregated results with top similar cases.
    """
    if not request.drug_a:
        raise HTTPException(status_code=400, detail="drug_a (proposed drug) required")

    proposed_drug = request.drug_a.strip().upper()
    current_meds = request.patient_current_meds or []

    # If drug_b provided, use it; otherwise use first current med
    if request.drug_b:
        current_meds = [request.drug_b.strip()] + [m for m in current_meds if m.upper().strip() != request.drug_b.upper().strip()]

    if not current_meds:
        raise HTTPException(status_code=400, detail="At least one current medication required")

    print(f"\n🔬 Checking: {proposed_drug} against {len(current_meds)} current medication(s)")

    # ========== PART 1: Query openFDA for each current med combo ==========
    print(f"⏳ PART 1: Querying openFDA for each combination...")
    all_combo_reports = []
    all_signals = []
    primary_data = None

    with track_operation("fda_query", drug_a=proposed_drug, patient_meds_count=len(current_meds)):
        for idx, current_med in enumerate(current_meds[:3], 1):  # Check top 3 meds to avoid too many queries
            current_med_clean = current_med.strip().upper()
            print(f"  ▪ Checking {proposed_drug} + {current_med_clean}...")

            try:
                data = await check_drug_combination(proposed_drug, current_med_clean)

                # Store first combination as primary for display
                if primary_data is None:
                    primary_data = data

                # Aggregate reports from all combinations
                all_combo_reports.extend(data.get("combo_reports", []))

                # Calculate signals for this combination
                combo_reactions = data.get("combo_reactions", {})
                combo_total = data.get("combo_total", 0)
                drug_a_reactions = data.get("drug_a_reactions", {})
                drug_a_total = data.get("drug_a_total", 0)
                drug_b_reactions = data.get("drug_b_reactions", {})
                drug_b_total = data.get("drug_b_total", 0)

                signals = find_elevated_signals(
                    combo_reactions, combo_total,
                    drug_a_reactions, drug_a_total,
                    drug_b_reactions, drug_b_total,
                    prr_threshold=PRR_THRESHOLD
                )
                all_signals.extend(signals)

                print(f"    ✅ Found {combo_total} reports, {len(signals)} signals")
            except Exception as e:
                print(f"    ⚠️  Query failed for {current_med_clean}: {e}")
                capture_exception(
                    e,
                    endpoint="/api/check-combination",
                    stage="openfda_query",
                    proposed_drug=proposed_drug,
                    current_med=current_med_clean,
                )

    if not primary_data:
        error = RuntimeError("openFDA queries failed")
        capture_exception(
            error,
            endpoint="/api/check-combination",
            stage="openfda_query",
            proposed_drug=proposed_drug,
            current_meds=current_meds[:3],
        )
        raise HTTPException(status_code=502, detail="openFDA queries failed")

    # Use primary combo data for display
    combo_total = primary_data["combo_total"]
    combo_reports = primary_data["combo_reports"]
    combo_reactions = primary_data["combo_reactions"]
    drug_a_reactions = primary_data["drug_a_reactions"]
    drug_a_total = primary_data["drug_a_total"]
    drug_b_reactions = primary_data["drug_b_reactions"]
    drug_b_total = primary_data["drug_b_total"]

    # Set display drugs (primary combination)
    drug_a = proposed_drug
    drug_b = current_meds[0].strip().upper()

    # Deduplicate signals by reaction name and aggregate
    signal_dict = {}
    for sig in all_signals:
        reaction = sig["reaction"]
        if reaction not in signal_dict or sig["prr_vs_drug_a"] > signal_dict[reaction]["prr_vs_drug_a"]:
            signal_dict[reaction] = sig

    signals = sorted(signal_dict.values(), key=lambda x: x["prr_vs_drug_a"], reverse=True)
    print(f"✅ Found {combo_total} primary combination reports, {len(signals)} unique elevated signals")

    # ========== PART 5: Data confidence assessment ==========
    confidence = calculate_data_confidence(combo_total)
    print(f"📈 Confidence: {confidence['level']}")

    # ========== PART 3: Find similar patient cases (using ALL aggregated reports) ==========
    # Deduplicate reports by safetyreportid
    seen_report_ids = set()
    deduplicated_reports = []
    for report in all_combo_reports:
        report_id = report.get("safetyreportid")
        if report_id not in seen_report_ids:
            seen_report_ids.add(report_id)
            deduplicated_reports.append(report)

    print(f"👥 PART 3: Finding similar patient cases from {len(deduplicated_reports)} deduplicated reports (was {len(all_combo_reports)})...")
    similar_cases = []
    try:
        similar_cases_data = find_similar_cases(
            patient_age=request.patient_age,
            patient_sex=request.patient_sex,
            patient_conditions=request.patient_conditions or [],
            patient_current_meds=request.patient_current_meds or [],
            faers_reports=deduplicated_reports,
            top_n=5,
            min_similarity=0.3
        )
        similar_cases = [SimilarCase(**case) for case in similar_cases_data]
        print(f"✅ Found {len(similar_cases)} similar cases (deduplicated)")
    except Exception as e:
        print(f"⚠️  Similarity scoring failed: {e}")
        capture_exception(
            e,
            endpoint="/api/check-combination",
            stage="similarity_scoring",
            drug_a=drug_a,
            drug_b=drug_b,
        )

    # ========== PART 4: Claude narrative + note ==========
    narrative_summary = ""
    clinical_note = ""

    if signals and combo_reports:
        print(f"📋 PART 4: Generating Claude summaries...")
        try:
            narrative_summary = summarize_narrative_pattern(
                drug_a, drug_b, combo_reports, signals[0]["reaction"], max_sample=5
            )
            print(f"✅ Generated narrative summary")

            clinical_note = generate_clinical_note(
                drug_a, drug_b, combo_total, signals,
                narrative_summary,
                patient_age=request.patient_age,
                patient_sex=request.patient_sex,
                patient_conditions=request.patient_conditions
            )
            print(f"✅ Generated clinical note")
        except Exception as e:
            print(f"⚠️  Claude generation failed: {e}")
            capture_exception(
                e,
                endpoint="/api/check-combination",
                stage="claude_generation",
                drug_a=drug_a,
                drug_b=drug_b,
            )
            narrative_summary = f"Could not generate summary: {str(e)}"
            clinical_note = f"Could not generate note: {str(e)}"

    # ========== Build final response ==========
    signal_objects = [ReactionSignal(**sig) for sig in signals]

    result = CheckResult(
        drug_a=drug_a,
        drug_b=drug_b,
        combo_total=combo_total,
        confidence=confidence["level"],
        confidence_message=confidence["message"],
        signals=signal_objects,
        similar_cases=similar_cases,
        narrative_summary=narrative_summary,
        clinical_note=clinical_note
    )

    # ========== PART 8: Store query result for trend analysis ==========
    try:
        store_query_result(
            drug_a, drug_b,
            {
                'combo_total': combo_total,
                'signals': [sig.dict() for sig in signal_objects]
            }
        )
        print(f"📊 Stored query result for trend analysis")
    except Exception as e:
        print(f"⚠️  Failed to store query result: {e}")
        capture_exception(
            e,
            endpoint="/api/check-combination",
            stage="store_query_result",
            drug_a=drug_a,
            drug_b=drug_b,
        )

    print(f"✅ Check complete!\n")
    return result


# ============================================================================
# PART 9: Real-time Updates & Trend Analysis Endpoints
# ============================================================================

@app.get("/api/trending-signals")
async def get_trending():
    """
    Get trending drug combinations (most frequently checked by doctors).

    Returns top 5 combos with their latest signal data.
    """
    try:
        trending = get_trending_signals(limit=5)
        return {
            "status": "success",
            "trending": trending,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error fetching trending signals: {e}")
        capture_exception(e, endpoint="/api/trending-signals")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/combo-history/{drug_a}/{drug_b}")
async def get_history(drug_a: str, drug_b: str, limit: int = 30):
    """
    Get historical data for a drug combination.

    Returns time-series data: report volume & PRR trends over time.
    Used for trending line charts.
    """
    try:
        history = get_combo_history(drug_a, drug_b, limit)
        return {
            "status": "success",
            "combo": f"{drug_a} + {drug_b}",
            "history": history,
            "points": len(history)
        }
    except Exception as e:
        print(f"Error fetching history: {e}")
        capture_exception(e, endpoint="/api/combo-history", drug_a=drug_a, drug_b=drug_b)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/new-signals/{drug_a}/{drug_b}")
async def check_new_signals(drug_a: str, drug_b: str, since: str):
    """
    Get signals that appeared or worsened since a timestamp.

    Returns alerts: "New PRR ≥ 2 signal detected!"
    Used for real-time notifications.
    """
    try:
        new_signals = get_new_signals_since(drug_a, drug_b, since)
        return {
            "status": "success",
            "combo": f"{drug_a} + {drug_b}",
            "new_signals": new_signals,
            "alert_count": len(new_signals),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error checking new signals: {e}")
        capture_exception(e, endpoint="/api/new-signals", drug_a=drug_a, drug_b=drug_b)
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/verify-report/{report_id}")
async def verify_report(report_id: str):
    """
    Fetch and display a specific FAERS report by safetyreportid.

    Returns formatted report details for user verification.
    """
    try:
        from services.openfda_service import fetch_report_by_id

        report = await fetch_report_by_id(report_id)

        if not report:
            raise HTTPException(
                status_code=404,
                detail=f"Report ID {report_id} not found. Note: Not all FAERS reports are indexed in openFDA. Try a different report ID from the similar cases."
            )

        # Extract key details for display
        safetyreportid = report.get("safetyreportid") or report_id
        receivedate = report.get("receivedate", "Unknown")

        # Patient info
        patient = report.get("patient", {})
        patient_age = str(patient.get("patientonsetage", "Unknown"))
        patient_sex = patient.get("patientsex")
        if patient_sex == "1":
            patient_sex = "M"
        elif patient_sex == "2":
            patient_sex = "F"
        else:
            patient_sex = patient_sex or "Unknown"

        # Reactions
        reactions = patient.get("reaction", [])
        if isinstance(reactions, dict):
            reactions = [reactions]
        reaction_list = [r.get("reactionmeddrapt", "Unknown") for r in reactions if r]
        reaction_list = [r for r in reaction_list if r and r != "Unknown"]

        # Drugs
        drugs = patient.get("drug", [])
        if isinstance(drugs, dict):
            drugs = [drugs]
        drug_list = [d.get("medicinalproduct", "Unknown") for d in drugs if d]
        drug_list = [d for d in drug_list if d and d != "Unknown"]

        return {
            "status": "success",
            "report_id": str(safetyreportid),
            "receive_date": receivedate,
            "patient_age": patient_age,
            "patient_sex": patient_sex,
            "reactions": reaction_list if reaction_list else ["No reactions reported"],
            "drugs": drug_list if drug_list else ["No drugs reported"]
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error verifying report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# Active WebSocket connections for broadcasting
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error broadcasting to client: {e}")


manager = ConnectionManager()


@app.websocket("/ws/signals")
async def websocket_signals(websocket: WebSocket):
    """
    WebSocket endpoint for real-time signal updates.

    Clients connect and receive live trending data updates.
    """
    await manager.connect(websocket)
    print("📡 WebSocket client connected")

    try:
        while True:
            # Wait for client message (keeps connection alive)
            data = await websocket.receive_text()

            if data == "ping":
                # Client ping - send trending data back
                try:
                    trending = get_trending_signals(limit=5)
                    await websocket.send_json({
                        "type": "trending",
                        "data": trending,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e)
                    })

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        manager.disconnect(websocket)
        print("📡 WebSocket client disconnected")


@app.post("/api/broadcast-signal")
async def broadcast_new_signal(combo: dict):
    """
    Internal endpoint: Broadcast a new signal to all connected WebSocket clients.

    Called from backend when a new signal emerges.
    """
    message = {
        "type": "new_signal",
        "combo": combo.get("combo"),
        "reaction": combo.get("reaction"),
        "prr": combo.get("prr"),
        "timestamp": datetime.utcnow().isoformat()
    }

    # Broadcast to all connected clients
    await manager.broadcast(message)

    return {"status": "broadcast_sent", "clients": len(manager.active_connections)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=HOST, port=PORT)
