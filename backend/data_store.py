"""
Data Persistence Layer - Stores FDA query results for trending analysis
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any

DATA_DIR = Path('data')
DATA_DIR.mkdir(exist_ok=True)
QUERIES_FILE = DATA_DIR / 'query_history.json'
SIGNALS_FILE = DATA_DIR / 'signals_trending.json'


def load_queries():
    """Load all stored queries."""
    if QUERIES_FILE.exists():
        try:
            with open(QUERIES_FILE, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}


def save_queries(data):
    """Save queries to storage."""
    with open(QUERIES_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def store_query_result(drug_a: str, drug_b: str, result: Dict[str, Any]):
    """
    Store a drug combination query result with timestamp.

    Enables trend analysis: how PRR/report counts change over time.
    """
    queries = load_queries()
    combo_key = f"{drug_a.upper()}+{drug_b.upper()}"

    if combo_key not in queries:
        queries[combo_key] = []

    # Add timestamp and store the result
    entry = {
        'timestamp': datetime.utcnow().isoformat(),
        'combo_total': result.get('combo_total', 0),
        'signals': [
            {
                'reaction': sig['reaction'],
                'combo_count': sig['combo_count'],
                'rate_in_combo': sig['rate_in_combo'],
                'prr_vs_drug_a': sig['prr_vs_drug_a'],
                'prr_vs_drug_b': sig['prr_vs_drug_b'],
            }
            for sig in result.get('signals', [])[:10]  # Top 10 signals
        ]
    }

    queries[combo_key].append(entry)

    # Keep last 30 queries per combo to avoid bloat
    if len(queries[combo_key]) > 30:
        queries[combo_key] = queries[combo_key][-30:]

    save_queries(queries)
    return combo_key


def get_trending_signals(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Get trending signals (combos checked most frequently by doctors).

    Returns top N combinations by number of recent queries.
    """
    queries = load_queries()

    trending = []
    for combo_key, history in queries.items():
        if not history:
            continue

        # Get latest result
        latest = history[-1]
        drug_a, drug_b = combo_key.split('+')

        # Count how many times this combo was checked
        check_count = len(history)

        # Calculate PRR trend (has it gotten worse?)
        prr_trend = 0
        if len(history) >= 2:
            latest_prr = max([max(s['prr_vs_drug_a'], s['prr_vs_drug_b']) for s in latest['signals']], default=0)
            older_prr = max([max(s['prr_vs_drug_a'], s['prr_vs_drug_b']) for s in history[-2]['signals']], default=0)
            prr_trend = latest_prr - older_prr

        trending.append({
            'combo': f"{drug_a} + {drug_b}",
            'drug_a': drug_a,
            'drug_b': drug_b,
            'check_count': check_count,
            'latest_reports': latest['combo_total'],
            'elevated_signals': len([s for s in latest['signals'] if max(s['prr_vs_drug_a'], s['prr_vs_drug_b']) >= 2]),
            'prr_trend': prr_trend,
            'last_checked': latest['timestamp'],
            'top_reaction': latest['signals'][0]['reaction'] if latest['signals'] else 'N/A',
            'top_prr': max([max(s['prr_vs_drug_a'], s['prr_vs_drug_b']) for s in latest['signals']], default=0),
        })

    # Sort by check count (most frequently checked by doctors = trending)
    trending.sort(key=lambda x: x['check_count'], reverse=True)
    return trending[:limit]


def get_combo_history(drug_a: str, drug_b: str, limit: int = 30) -> List[Dict[str, Any]]:
    """
    Get historical data for a specific drug combination.

    Returns time-series data for charting PRR/report trends.
    """
    queries = load_queries()
    combo_key = f"{drug_a.upper()}+{drug_b.upper()}"

    if combo_key not in queries:
        return []

    history = queries[combo_key][-limit:]

    # Format for charts: each entry has timestamp + top PRR + report count
    timeseries = []
    for entry in history:
        top_prr = max([max(s['prr_vs_drug_a'], s['prr_vs_drug_b']) for s in entry['signals']], default=0)
        timeseries.append({
            'timestamp': entry['timestamp'],
            'date': entry['timestamp'][:10],  # YYYY-MM-DD
            'reports': entry['combo_total'],
            'top_prr': round(top_prr, 2),
            'signal_count': len([s for s in entry['signals'] if max(s['prr_vs_drug_a'], s['prr_vs_drug_b']) >= 2]),
        })

    return timeseries


def get_new_signals_since(drug_a: str, drug_b: str, timestamp: str) -> List[Dict[str, Any]]:
    """
    Get signals that appeared or worsened since a given timestamp.

    Used for real-time alerts: "New PRR ≥ 2 signal detected!"
    """
    queries = load_queries()
    combo_key = f"{drug_a.upper()}+{drug_b.upper()}"

    if combo_key not in queries:
        return []

    new_signals = []
    history = queries[combo_key]

    # Find entries after the given timestamp
    recent = [h for h in history if h['timestamp'] > timestamp]

    if len(recent) < 2:
        return []

    # Compare latest to previous
    latest_reactions = {s['reaction']: s for s in recent[-1]['signals']}
    older_reactions = {s['reaction']: s for s in recent[-2]['signals']}

    for reaction, latest_data in latest_reactions.items():
        latest_prr = max(latest_data['prr_vs_drug_a'], latest_data['prr_vs_drug_b'])

        if reaction in older_reactions:
            older_prr = max(older_reactions[reaction]['prr_vs_drug_a'], older_reactions[reaction]['prr_vs_drug_b'])
            # Alert if newly elevated or significantly worsened
            if latest_prr >= 2 and (older_prr < 2 or latest_prr > older_prr):
                new_signals.append({
                    'reaction': reaction,
                    'previous_prr': round(older_prr, 2),
                    'current_prr': round(latest_prr, 2),
                    'is_new': older_prr < 2 and latest_prr >= 2,
                    'worsened': latest_prr > older_prr and latest_prr >= 2,
                })
        else:
            # Completely new signal
            if latest_prr >= 2:
                new_signals.append({
                    'reaction': reaction,
                    'previous_prr': 0,
                    'current_prr': round(latest_prr, 2),
                    'is_new': True,
                    'worsened': False,
                })

    return new_signals
