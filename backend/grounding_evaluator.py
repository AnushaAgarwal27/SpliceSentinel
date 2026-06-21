"""
Phoenix Hacker Starter Pack - Move 2: Build an Eval

LLM-as-a-judge evaluator for drug-interaction-checker.

This evaluator scores whether Claude's narrative summaries are strictly
grounded in the source FAERS report data they were given.

Labels: "grounded" (1.0) or "hallucinated" (0.0)
Includes explanations for every judgment.
"""

import os
import asyncio
from dotenv import load_dotenv

load_dotenv()

# ============================================================================
# 1. CREATE THE LLM-AS-A-JUDGE EVALUATOR
# ============================================================================

from phoenix.evals import ClassificationEvaluator, LLM

# Define the grounding criterion
GROUNDING_TEMPLATE = """You are evaluating whether a clinical narrative is grounded
in real patient case data.

<context>
FAERS CASES PROVIDED TO CLAUDE:
{{input}}
</context>

<response>
CLAUDE'S NARRATIVE SUMMARY:
{{output}}
</response>

Task: Does every claim in Claude's narrative come from or logically follow from
the FAERS cases provided?

Examples:
✅ GROUNDED: "elevated gastrointestinal bleeding"
   (if the FAERS cases mention bleeding reactions)

✅ GROUNDED: "typical onset within 2 weeks"
   (if the cases show timing information supporting this)

❌ HALLUCINATED: "causes permanent liver damage"
   (if the FAERS cases don't mention liver damage)

❌ HALLUCINATED: "affects 50% of users"
   (if there's no prevalence/percentage data in the cases)

Be strict: only label "grounded" if all claims are directly supported by the data.

Answer "grounded" or "hallucinated", then explain your reasoning:"""

# Create the evaluator using ClassificationEvaluator
# Provider: Anthropic (using our Claude API key)
# Model: claude-opus-4-7
# Choices: grounded (1.0) vs hallucinated (0.0)
# Explanations: Enabled by default in ClassificationEvaluator

grounding_evaluator = ClassificationEvaluator(
    name="grounding",
    prompt_template=GROUNDING_TEMPLATE,
    llm=LLM(provider="anthropic", model="claude-opus-4-7"),
    choices={"grounded": 1.0, "hallucinated": 0.0},
)

print("✅ Created ClassificationEvaluator: grounding")
print("   - Provider: Anthropic (Claude)")
print("   - Criterion: Is Claude's narrative grounded in FAERS data?")
print("   - Labels: grounded (1.0) | hallucinated (0.0)")
print("   - Explanations: enabled\n")


# ============================================================================
# 2. FETCH TRACES FROM PHOENIX CLOUD
# ============================================================================

from phoenix.client import Client
from phoenix.evals import evaluate_dataframe, async_evaluate_dataframe
from phoenix.evals.utils import to_annotation_dataframe
from phoenix.trace import suppress_tracing

# Connect to Phoenix Cloud
endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")
api_key = os.getenv("PHOENIX_API_KEY")
project_name = os.getenv("PHOENIX_PROJECT", "drug-interaction-checker")

print(f"📡 Phoenix Cloud Configuration:")
print(f"   Endpoint: {endpoint}")
print(f"   Project: {project_name}\n")

# Create Phoenix client
px = Client(endpoint=endpoint, api_key=api_key)

# Fetch spans from project
spans_df = px.spans.get_spans_dataframe(project_name=project_name)

print(f"📥 Fetched {len(spans_df)} total spans from Phoenix\n")

# Filter to LLM spans (Claude API calls)
# Look for span_kind == "LLM" or span names containing "claude"
llm_spans = spans_df[
    (spans_df["span_kind"] == "LLM") |
    (spans_df["span_name"].str.contains("claude|anthropic", case=False, na=False))
].copy()

print(f"🔍 Found {len(llm_spans)} Claude LLM spans\n")

if llm_spans.empty:
    print("⚠️  No Claude spans found. Run your app to generate traces first.")
    exit(0)

# Prepare dataframe for evaluation
# Remove rows with missing input or output
eval_df = llm_spans[["input", "output"]].dropna(subset=["input", "output"])

print(f"📊 Evaluating {len(eval_df)} spans...\n")


# ============================================================================
# 3. RUN EVALUATIONS
# ============================================================================

# Run evaluator over traces
# suppress_tracing() prevents eval's own LLM calls from being traced
with suppress_tracing():
    results_df = evaluate_dataframe(
        dataframe=eval_df,
        evaluators=[grounding_evaluator],
        concurrency=5,  # Run 5 evals in parallel
    )

print(f"✅ Evaluations complete\n")


# ============================================================================
# 4. LOG RESULTS BACK TO PHOENIX
# ============================================================================

# Convert results to Phoenix annotation format
annotations_df = to_annotation_dataframe(results_df)

# Log annotations to Phoenix Cloud
# Results will appear next to traces in the UI with:
# - label (grounded/hallucinated)
# - score (1.0/0.0)
# - explanation (why the judgment was made)
px.spans.log_span_annotations_dataframe(dataframe=annotations_df)

print("📤 Logged results to Phoenix Cloud\n")


# ============================================================================
# 5. DISPLAY SUMMARY
# ============================================================================

print("=" * 70)
print("📊 GROUNDING EVAL RESULTS")
print("=" * 70)

# Count results by label
label_counts = results_df["label"].value_counts()
for label, count in label_counts.items():
    pct = (count / len(results_df)) * 100
    score = "✅ PASS" if label == "grounded" else "❌ FAIL"
    print(f"  {score}  {label.upper()}: {count} spans ({pct:.0f}%)")

print()

# Show failures with explanations
failures = results_df[results_df["label"] == "hallucinated"]
if not failures.empty:
    print("⚠️  HALLUCINATIONS DETECTED:")
    print()
    for idx, row in failures.head(5).iterrows():
        explanation = row.get("explanation", "No explanation")
        print(f"  • {explanation[:120]}...")
        print()

print("=" * 70)
print(f"✅ Results logged to Phoenix Cloud")
print(f"   Go to: {endpoint}")
print(f"   Project: {project_name}")
print("   View traces with eval results in the Traces tab")
print("=" * 70)
