#!/usr/bin/env python3
"""
Test script to verify openFDA API connectivity and real data.
"""

import requests
import json
from datetime import datetime

print("=" * 80)
print("🔬 openFDA API Test - Warfarin + Ibuprofen Query")
print("=" * 80)
print(f"Timestamp: {datetime.now().isoformat()}\n")

# The exact URL from the user
url = 'https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:"WARFARIN"+AND+patient.drug.medicinalproduct:"IBUPROFEN"&limit=10'

print(f"📡 Requesting: {url}\n")

try:
    print("⏳ Sending request...")
    response = requests.get(url, timeout=10)

    print(f"✅ Status Code: {response.status_code}\n")

    if response.status_code == 200:
        data = response.json()

        print("📊 Raw JSON Response:")
        print("-" * 80)
        print(json.dumps(data, indent=2))
        print("-" * 80)

        print("\n📈 Summary:")
        if 'meta' in data:
            print(f"   Total Results Available: {data['meta'].get('results', {}).get('total', 'N/A')}")
            print(f"   Results Returned: {data['meta'].get('results', {}).get('skip', 0)} - {data['meta'].get('results', {}).get('limit', 10)}")

        if 'results' in data:
            print(f"   Results in This Response: {len(data['results'])}")

            if data['results']:
                print("\n🏥 First Report Sample:")
                first = data['results'][0]
                print(f"   Serious: {first.get('serious', 'N/A')}")
                print(f"   Outcome: {first.get('serious_outcome', 'N/A')}")
                print(f"   Age: {first.get('patient', {}).get('patientonsetage', 'N/A')}")
                print(f"   Sex: {first.get('patient', {}).get('patientsex', 'N/A')}")

                if 'patient' in first and 'reaction' in first['patient']:
                    reactions = first['patient'].get('reaction', [])
                    if reactions:
                        print(f"   Reactions: {[r.get('reactionmeddrapt', 'N/A') for r in reactions[:3]]}")

        print("\n✅ API is working! Real data confirmed.\n")
    else:
        print(f"❌ Error: Status {response.status_code}")
        print(f"Response: {response.text}\n")

except requests.exceptions.Timeout:
    print("❌ Error: Request timed out (API not responding within 10 seconds)\n")
except requests.exceptions.ConnectionError:
    print("❌ Error: Could not connect to FDA API (network/DNS issue)\n")
except json.JSONDecodeError:
    print("❌ Error: Response is not valid JSON\n")
except Exception as e:
    print(f"❌ Error: {type(e).__name__}: {str(e)}\n")

print("=" * 80)
