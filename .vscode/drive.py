import sys
import os
import json

current_dir = os.path.join(os.path.dirname(__file__))
parent_dir = os.path.abspath(os.path.join(current_dir, "../src/lambda"))
with open(os.path.join(current_dir, "event.json")) as f:
    event = json.load(f)

sys.path.append(parent_dir)
import index

index.handler(event, {})
