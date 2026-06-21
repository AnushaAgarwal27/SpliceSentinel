# 🔬 Drug Interaction Checker - Proof of Real FDA Data

## How to Verify This App Uses REAL FDA Data

### Quick Demo (60 seconds)

#### Step 1: Run the test script
```bash
cd /Users/anushaagarwal/drug-interaction-checker
python3 test_fda_api.py
```

**Shows:**
- ✅ Direct connection to FDA API
- ✅ Status 200 (success)
- ✅ **1,628 real Warfarin + Ibuprofen adverse event reports**
- ✅ Real patient data (age 82, serious event, blood clot)

---

### Step 2: View Raw FDA Data in Browser
Visit this endpoint directly:
```
http://localhost:8000/debug/fda-raw/warfarin/ibuprofen
```

**Shows:**
- Drug combination: Warfarin + Ibuprofen
- Total reports found: **1,628**
- Sample patient reports with real data
- Actual adverse reactions documented

---

### Step 3: Use the Full App
1. Go to `http://localhost:3000`
2. Enter:
   - Drug A: Warfarin
   - Drug B: Ibuprofen
   - Age: 67
3. Click "Check Combination"

**Shows:**
- Real FDA data being processed
- 266 elevated signals detected
- Statistical analysis (PRR scores)
- Similar real patient cases

---

## 🔐 How We Verify It's Real (Not Fake Data)

### The FDA API is Public and Verifiable
**All data comes from:** `https://api.fda.gov/drug/event.json`

You can verify this yourself:
```bash
# Open in browser or curl
https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"WARFARIN"+AND+patient.drug.medicinalproduct:"IBUPROFEN"&limit=1
```

This will show you the SAME data our app uses.

### What Makes It Real:
✅ **Government Source** - FDA's official FAERS database  
✅ **Public API** - Anyone can query it (no secret sauce)  
✅ **Verifiable Records** - Each report has SafetyReportID  
✅ **Real Patient Cases** - Age, sex, reactions, outcomes  
✅ **No Mock Data** - We literally call FDA's servers in real-time  

---

## 📊 Example Output

When you query "Warfarin + Ibuprofen", the system finds:

```json
{
  "status": "success",
  "drug_a": "warfarin",
  "drug_b": "ibuprofen",
  "total_reports": 1628,
  "sample_reactions": [
    "Deep vein thrombosis",
    "International normalised ratio increased",
    "Pulmonary embolism",
    "Bleeding"
  ]
}
```

**Each report contains:**
- Patient age & sex
- Serious event indicator (hospitalization, death, etc.)
- Actual adverse reactions experienced
- Transmission date to FDA
- Report ID (can be looked up in FDA database)

---

## 🎯 For Judges: Verification Checklist

- [ ] Run `python3 test_fda_api.py` - see 1,628 real reports
- [ ] Visit `http://localhost:8000/debug/fda-raw/warfarin/ibuprofen` - see raw JSON
- [ ] Use the app to check a combination - see FDA data processed
- [ ] Query FDA API directly to verify we're using official data
- [ ] Check SafetyReportID in our results against FDA's database

---

## 💡 Why This Matters for a Hackathon

**Most drug interaction checkers use:**
- ❌ Medical textbooks (outdated, limited)
- ❌ Pharmacy databases (expensive, limited access)
- ❌ Simulated data (fake examples)

**Our app uses:**
- ✅ **Real adverse event reports** from 30M+ FDA records
- ✅ **Live data** - updated with new reports
- ✅ **Public API** - anyone can verify and audit
- ✅ **Free to use** - no licensing costs
- ✅ **Statistical proof** - PRR analysis, not guessing

---

## 🔗 Links for Judges

1. **Our Debug Endpoint:** http://localhost:8000/debug/fda-raw/warfarin/ibuprofen
2. **FDA FAERS API:** https://open.fda.gov/apis/drug/event/
3. **Live App:** http://localhost:3000
4. **Test Script:** `python3 test_fda_api.py`

---

**TL;DR:** Every number in our app comes directly from FDA's official database. You can verify it in 60 seconds. ✅
