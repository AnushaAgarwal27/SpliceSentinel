"""
Build and run grounding evaluator for drug-interaction-checker.

Evaluates whether Claude's narrative summaries stay strictly grounded
in the source FAERS report data they were given.
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

# Check required env vars
if not os.getenv("ANTHROPIC_API_KEY"):
    print("❌ ANTHROPIC_API_KEY not set in .env")
    sys.exit(1)

# Now import Phoenix - should work with proper env
try:
    from phoenix.evals import ClassificationEvaluator, LLM, evaluate_dataframe
    from phoenix.client import Client
    from phoenix.evals.utils import to_annotation_dataframe
    from phoenix.trace import suppress_tracing
    print("✅ Phoenix imports successful")
except Exception as e:
    print(f"❌ Import failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Create the grounding evaluator
GROUNDING_TEMPLATE = """You are evaluating whether a clinical narrative is grounded
in real patient case data.

FAERS CASES PROVIDED TO CLAUDE:
<context>{{input}}</context>

CLAUDE'S NARRATIVE SUMMARY:
<response>{{output}}</response>

Task: Does every claim in Claude's narrative come from or logically follow from
the FAERS cases provided?

Look for:
✅ GROUNDED: "elevated gastrointestinal bleeding" (if cases mention bleeding)
✅ GROUNDED: "typical onset within 2 weeks" (if cases show this timing)
❌ HALLUCINATED: "causes permanent liver damage" (if cases don't mention this)
❌ HALLUCINATED: "affects 50% of users" (if no prevalence data in cases)

Answer "grounded" if all claims are supported, "hallucinated" if any claim
lacks evidence. Then explain your reasoning.

Your answer (grounded/hallucinated):"""

grounding_eval = ClassificationEvaluator(
    name="grounding",
    prompt_template=GROUNDING_TEMPLATE,
    llm=LLM(provider="anthropic", model="claude-opus-4-7"),
    choices={"grounded": 1.0, "hallucinated": 0.0},
)

print("\n✅ Grounding evaluator created")
print("   - Scores whether Claude cites real FAERS data")
print("   - Labels: grounded (1.0) vs hallucinated (0.0)")
print("   - Includes explanations\n")

# Connect to Phoenix Cloud
endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")
api_key = os.getenv("PHOENIX_API_KEY")
project = os.getenv("PHOENIX_PROJECT", "drug-interaction-checker")

print(f"📡 Connecting to Phoenix:")
print(f"   Endpoint: {endpoint}")
print(f"   Project: {project}\n")

try:
    client = Client(endpoint=endpoint, api_key=api_key)
    print("✅ Connected to Phoenix Cloud\n")
except Exception as e:
    print(f"❌ Phoenix connection failed: {e}")
    sys.exit(1)

# Fetch traces from Phoenix
print("📥 Fetching traces from Phoenix...")
try:
    spans_df = client.spans.get_spans_dataframe(project_name=project)
except Exception as e:
    print(f"❌ Failed to fetch spans: {e}")
    sys.exit(1)

if spans_df.empty:
    print("⚠️  No spans found. Run your app first to generate traces.")
    sys.exit(0)

print(f"✅ Fetched {len(spans_df)} total spans\n")

# Filter to Claude API call spans (look for LLM span kind and anthropic in name)
claude_spans = spans_df[
    (spans_df["span_kind"] == "LLM") |
    (spans_df["span_name"].str.contains("claude|anthropic", case=False, na=False))
]

if claude_spans.empty:
    print("⚠️  No Claude/Anthropic spans found in traces")
    print("   Make sure your app makes Claude API calls")
    sys.exit(0)

print(f"✅ Found {len(claude_spans)} Claude LLM spans\n")

# Rename columns to match template variables
# Phoenix stores input in 'input' and output in 'output'
eval_df = claude_spans[["input", "output"]].copy()
eval_df = eval_df.dropna(subset=["input", "output"])

if eval_df.empty:
    print("⚠️  No spans with both input and output found")
    sys.exit(0)

print(f"📊 Evaluating {len(eval_df)} Claude calls...\n")

# Run evaluator
with suppress_tracing():  # Don't trace the evals themselves
    try:
        results_df = evaluate_dataframe(
            dataframe=eval_df,
            evaluators=[grounding_eval],
            concurrency=5,
        )
        print(f"✅ Evaluations complete\n")
    except Exception as e:
        print(f"❌ Evaluation failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

# Log results back to Phoenix
print("📤 Logging results to Phoenix...")
try:
    annotations_df = to_annotation_dataframe(results_df)
    client.spans.log_span_annotations_dataframe(dataframe=annotations_df)
    print("✅ Results logged to Phoenix!\n")
except Exception as e:
    print(f"⚠️  Failed to log results: {e}")

# Summary
print("=" * 60)
print("📊 GROUNDING EVAL RESULTS")
print("=" * 60)

if "label" in results_df.columns:
    label_counts = results_df["label"].value_counts()
    for label, count in label_counts.items():
        pct = (count / len(results_df)) * 100
        print(f"  {label.upper()}: {count} ({pct:.0f}%)")

    # Show failures
    failures = results_df[results_df["label"] == "hallucinated"]
    if not failures.empty:
        print(f"\n⚠️  {len(failures)} HALLUCINATIONS DETECTED:")
        for idx, row in failures.iterrows():
            explanation = row.get("explanation", "")[:100]
            print(f"   - {explanation}...")

print("\n✅ Eval complete! Check Phoenix dashboard for full results.")
print(f"   Go to: {endpoint}")
