#!/usr/bin/env python3
"""
Run Phoenix evaluators on drug-interaction-checker traces.

Usage:
    python run_evals.py

This script:
1. Fetches traces from Phoenix Cloud
2. Extracts Claude call spans (inputs/outputs)
3. Runs grounding + completeness evals
4. Logs results back to Phoenix with explanations
"""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from phoenix.client import Client
from phoenix.evals import async_evaluate_dataframe
from phoenix.evals.utils import to_annotation_dataframe
from phoenix.trace import suppress_tracing
from evaluators import create_grounding_evaluator, create_completeness_evaluator


async def main():
    print("📊 Phoenix Evaluator Runner")
    print("=" * 50)

    # Connect to Phoenix Cloud
    endpoint = os.getenv("PHOENIX_COLLECTOR_ENDPOINT")
    api_key = os.getenv("PHOENIX_API_KEY")
    project = os.getenv("PHOENIX_PROJECT", "drug-interaction-checker")

    print(f"\n📡 Connecting to Phoenix: {endpoint}")
    print(f"🔍 Project: {project}")

    px = Client(endpoint=endpoint, api_key=api_key)

    # Fetch traces
    print(f"\n📥 Fetching spans from project '{project}'...")
    try:
        spans = px.spans.get_spans_dataframe(project_name=project)
    except Exception as e:
        print(f"❌ Error fetching spans: {e}")
        print("💡 Have you run the app yet? (No traces found)")
        return

    if spans.empty:
        print("❌ No spans found in Phoenix. Run your app first!")
        return

    print(f"✅ Fetched {len(spans)} total spans")

    # Filter to Claude call spans (LLM calls)
    # Look for spans where the LLM (Claude) made an API call
    claude_spans = spans[spans["span_name"].str.contains("claude|anthropic", case=False, na=False)]

    if claude_spans.empty:
        print("⚠️  No Claude/Anthropic spans found. Make sure traces contain Claude calls.")
        return

    print(f"✅ Found {len(claude_spans)} Claude spans")

    # Show sample spans
    print("\n📋 Sample spans:")
    for idx, span in claude_spans.head(3).iterrows():
        print(f"  - {span.get('span_name', 'unknown')}")

    # Create evaluators
    print("\n🏆 Creating evaluators...")
    grounding_eval = create_grounding_evaluator()
    completeness_eval = create_completeness_evaluator()
    print("✅ Evaluators created")

    # Run evals
    print("\n⏳ Running evaluations (this may take a minute)...")
    with suppress_tracing():  # Don't trace the evals themselves
        try:
            results = await async_evaluate_dataframe(
                dataframe=claude_spans,
                evaluators=[grounding_eval, completeness_eval],
                concurrency=5,
            )
        except Exception as e:
            print(f"❌ Eval error: {e}")
            return

    print(f"✅ Evaluations complete: {len(results)} results")

    # Log results back to Phoenix
    print("\n📤 Logging results back to Phoenix...")
    try:
        annotations_df = to_annotation_dataframe(results)
        px.spans.log_span_annotations_dataframe(dataframe=annotations_df)
        print("✅ Results logged to Phoenix!")
    except Exception as e:
        print(f"⚠️  Error logging results: {e}")

    # Summary
    print("\n📊 Eval Summary:")
    if "label" in results.columns:
        grounding_labels = results[results["eval_name"] == "grounding"]["label"].value_counts()
        print(f"\n  Grounding:")
        for label, count in grounding_labels.items():
            print(f"    {label}: {count}")

    print("\n✅ Done! Check Phoenix dashboard to see eval results.")


if __name__ == "__main__":
    asyncio.run(main())
