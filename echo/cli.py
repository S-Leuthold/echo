import argparse, json, sys
from datetime import date
from echo.config_loader import load_config
from echo.scheduler     import build_schedule
from echo.prompt_engine import build_prompt, parse_response
from echo.plan_utils    import merge_plan

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", default="config/sample_config.yaml")
    ap.add_argument("--notes",   default="{}")
    args = ap.parse_args()

    cfg      = load_config(args.profile)
    partial  = build_schedule(cfg, date.today())
    notes    = json.loads(args.notes)
    prompt   = build_prompt(cfg, partial, notes, date.today())

    # SKIPPING GPT call here—return partial for bridge test
    plan = [b.to_dict() for b in partial]
    json.dump(plan, sys.stdout)

if __name__ == "__main__":
    main()
