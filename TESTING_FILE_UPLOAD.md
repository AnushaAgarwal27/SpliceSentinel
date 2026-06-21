# 🧪 Testing File Upload Feature

## What We Built

Your app now has **TWO ways** to input patient data:

### Method 1: Manual Entry ✏️
Traditional form - type in each field

### Method 2: Upload Documents 📄  
Upload patient report + prescription → Claude AI extracts structured data

---

## How to Test File Upload

### Step 1: Go to App
```
http://localhost:3000
```

### Step 2: Click "📄 Upload Documents" Tab
You'll see two file upload boxes:
- Patient Medical Report
- Proposed Prescription

### Step 3: Upload Mock Files
We created mock files in your project:
```
/Users/anushaagarwal/drug-interaction-checker/MOCK_PATIENT_REPORT.txt
/Users/anushaagarwal/drug-interaction-checker/MOCK_PRESCRIPTION.txt
```

Upload both files.

### Step 4: Click "📋 Extract Patient Data"
The backend will:
1. Read both text files
2. Send to Claude AI
3. Parse structured fields:
   - Patient age: **67**
   - Sex: **Male**  
   - Conditions: **Atrial fibrillation, Hypertension, Type 2 Diabetes**
   - Current meds: **Warfarin, Metoprolol, Lisinopril, Metformin**
   - Proposed drug: **Ibuprofen**
   - Illness: **Lower back pain from degenerative disc disease**

### Step 5: Review & Confirm
The app shows extracted fields. You can:
- ✓ Accept as-is (click "Confirm & Check Risk")
- ✏️ Edit any fields before checking
- ↺ Upload different files

### Step 6: See Real FDA Results
Once confirmed, it queries FDA with:
- **Drug A:** Ibuprofen (proposed)
- **Drug B:** Warfarin (first in current meds)
- **Patient context:** 67M, AFib, on anticoagulation

Results will show:
- ⚠️ **ELEVATED SIGNALS** found
- Real adverse event data
- Similar patient cases
- Risk assessment

---

## Why This Matters

### Traditional Drug Checker
```
"Check Warfarin + Ibuprofen"
→ Shows generic data
→ No patient context
→ Not clinically useful
```

### Your App (Now)
```
1. Doctor uploads: Patient report + New prescription
2. AI auto-extracts: Age, conditions, current meds
3. FDA query with context: "67-year-old on anticoagulation"
4. Real results: "266 elevated signals - HIGH RISK"
5. Doctor sees: Similar real cases from FDA
```

---

## Claude AI Extraction

When you upload documents, here's what happens:

**Input to Claude:**
```
"I have a 67-year-old male with:
- Atrial fibrillation (on Warfarin)
- Hypertension
- Type 2 Diabetes
He's taking: Warfarin, Metoprolol, Lisinopril, Metformin
Doctor wants to prescribe: Ibuprofen
Reason: Lower back pain"
```

**Claude Returns:**
```json
{
  "patient_age": 67,
  "patient_sex": "Male",
  "patient_conditions": ["Atrial fibrillation", "Hypertension", "Type 2 Diabetes"],
  "patient_current_meds": ["Warfarin", "Metoprolol", "Lisinopril", "Metformin"],
  "proposed_drug": "Ibuprofen",
  "illness_indication": "Lower back pain from degenerative disc disease",
  "confidence": 0.95
}
```

---

## For Your Hackathon Demo

**Show the Judges:**

1. **"Manual Entry" Tab**
   - Type: Warfarin + Ibuprofen
   - Shows: Generic drug combo risk

2. **"Upload Documents" Tab**  
   - Upload: MOCK_PATIENT_REPORT.txt + MOCK_PRESCRIPTION.txt
   - Claude extracts structured data
   - Shows: **Real patient context + FDA data**
   - Results: "266 elevated signals for this specific 67-year-old"

**Judge Reaction:** 🤯
"Wait, you extracted ALL the patient data from documents automatically AND checked it against FDA data?!"

---

## Real-World Usage

In production, doctors would:

1. Upload actual patient EHR export (PDF)
2. Upload actual prescription (PDF from pharmacy system)
3. System auto-extracts fields
4. Doctor reviews & confirms
5. FDA risk check runs
6. Clinical note auto-generates
7. Integrated into EHR workflow

---

## Troubleshooting

**"Extract button does nothing"**
- Make sure both files are uploaded
- Check browser console (F12) for errors
- Verify backend is running (`curl http://localhost:8000/health`)

**"No data extracted"**
- Claude API key might not be set
- Check `.env` file has `ANTHROPIC_API_KEY`
- Check `/tmp/backend.log` for errors

**"All zeros / wrong data extracted"**
- Claude might be confused by file format
- Try uploading plain .txt instead of .pdf
- Mock files are guaranteed to work

---

## Files for Testing

We created these for you:

```
MOCK_PATIENT_REPORT.txt
- 67-year-old male
- Atrial fibrillation, Hypertension, Diabetes
- On: Warfarin, Metoprolol, Lisinopril, Metformin
- Chief complaint: Lower back pain

MOCK_PRESCRIPTION.txt
- Prescribing: Ibuprofen 400mg TID
- For: Degenerative disc disease
- ⚠️ High-risk combo (Warfarin + NSAID)
```

Both are plain text, easy to parse.

---

## What's Next

After the demo works:

1. **Real PDFs:** Try with actual patient report PDFs
2. **OCR for Images:** Add image support (currently: PDF + TXT)
3. **EHR Integration:** Connect to real hospital systems
4. **Multi-Drug Check:** Check ALL current meds vs proposed drug (not just first one)
5. **Automated Alerts:** Send alerts if risk exceeds threshold

---

Ready to test? Go to http://localhost:3000 and click "📄 Upload Documents" 🚀
