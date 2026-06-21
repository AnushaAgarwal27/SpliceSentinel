"""
Part 2: Run Evaluator Over Traces and Log Results Back to Phoenix

This script:
1. Fetches traces from Phoenix Cloud
2. Scores them with the judge
3. Logs results back to Phoenix UI with explanations
"""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from phoenix.client import Client
from phoenix.evals import async_evaluate_dataframe
from phoenix.evals.utils import to_annotation_dataframe
from phoenix.trace import suppress_tracing
from evaluator import judge

# Initialize Phoenix client
px = Client()

# Fetch traces from your project
spans = px.spans.get_spans_dataframe(project_name="drug-interaction-checker")

print(f"📥 Fetched {len(spans)} spans from Phoenix")

# Filter to root spans (top-level calls)
# These are the complete drug check runs
root_spans = spans[spans["span_kind"] == "CHAIN"]

print(f"📊 Found {len(root_spans)} root spans (CHAIN) to evaluate")

if root_spans.empty:
    print("⚠️  No CHAIN spans found. Run your app first to generate traces.")
    exit(0)


async def run_evals():
    """Run evaluations asynchronously."""

    print(f"\n⏳ Running grounding evaluator over {len(root_spans)} traces...")

    with suppress_tracing():  # don't trace the judge's own LLM calls
        results = await async_evaluate_dataframe(
            dataframe=root_spans,
            evaluators=[judge],
            concurrency=10,
        )

    print(f"✅ Evaluations complete")

    # Convert to Phoenix annotation format
    annotations_df = to_annotation_dataframe(results)

    # Log results back to Phoenix
    print(f"\n📤 Logging results to Phoenix...")
    px.spans.log_span_annotations_dataframe(
        dataframe=annotations_df
    )
    print(f"✅ Results logged!")

    # Show summary
    print(f"\n📊 RESULTS SUMMARY:")
    print(results[["label", "score"]].value_counts())

    return results


# Run the evaluator
if __name__ == "__main__":
    results = asyncio.run(run_evals())

    print(f"\n✅ Done! Check Phoenix dashboard:")
    print(f"   {os.getenv('PHOENIX_COLLECTOR_ENDPOINT')}")
    print(f"   Your traces now have eval annotations with explanations.")
