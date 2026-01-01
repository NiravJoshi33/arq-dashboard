#!/usr/bin/env python3
"""
Simple script to unpickle data from stdin and output JSON to stdout.
Used by the Node.js ARQ dashboard to decode pickle-formatted job data.
"""

import sys
import pickle
import json


def unpickle_from_stdin():
    """Read pickle data from stdin and output JSON."""
    try:
        # Read binary data from stdin
        data = sys.stdin.buffer.read()

        # Unpickle the data
        obj = pickle.loads(data)

        # Convert to JSON and output
        # Handle special Python types that need conversion
        result = convert_to_json_safe(obj)
        print(json.dumps(result))

    except Exception as e:
        # Output error as JSON for proper error handling
        print(
            json.dumps({"error": str(e), "type": str(type(e).__name__)}),
            file=sys.stderr,
        )
        sys.exit(1)


def convert_to_json_safe(obj):
    """Convert Python objects to JSON-safe types."""
    if isinstance(obj, dict):
        return {k: convert_to_json_safe(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [convert_to_json_safe(item) for item in obj]
    elif isinstance(obj, bytes):
        # Try to decode bytes as UTF-8, fallback to base64
        try:
            return obj.decode("utf-8")
        except UnicodeDecodeError:
            import base64

            return {"__bytes__": base64.b64encode(obj).decode("ascii")}
    elif isinstance(obj, (int, float, str, bool, type(None))):
        return obj
    else:
        # For other types, convert to string representation
        return str(obj)


if __name__ == "__main__":
    unpickle_from_stdin()
