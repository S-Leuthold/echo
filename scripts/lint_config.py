# lint_config.py
import sys
from ruamel.yaml import YAML

REQUIRED_KEYS = ["defaults", "weekly_schedule", "projects", "profiles"]

def check_key_order(config_path):
    yaml = YAML()
    with open(config_path, "r") as f:
        data = yaml.load(f)

    keys = list(data.keys())
    if keys != REQUIRED_KEYS:
        print(f"❌ Config key order invalid: {keys}")
        print(f"   Expected order: {REQUIRED_KEYS}")
        sys.exit(1)

    print("✅ Config key order is valid.")

if __name__ == "__main__":
    check_key_order("config/sample_config.yaml")
