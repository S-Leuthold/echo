from datetime import date
from echo.config_loader import load_config
from echo.scheduler     import build_schedule
from echo.prompt_engine import build_prompt, parse_response
from echo.plan_utils    import merge_plan
from echo.calendar_writer import push
import os, json, openai
from openai import OpenAI

# --- OpenAI key ---
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# --- Build partial plan (anchors + fixed) ---
cfg      = load_config("config/sample_config.yaml")
partial  = build_schedule(cfg, date.today())

# --- Guided planning note (stub) ---
planning_notes = {"Priority": "Deep work on MIR methods"}

# --- Build prompt & call GPT ---
prompt   = build_prompt(cfg, partial, planning_notes, date.today())
resp     = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role":"user","content": prompt}],
    temperature=0.3,
)
gpt_txt  = resp.choices[0].message.content
extra    = parse_response(gpt_txt)

# --- Merge & validate ---
final    = merge_plan(partial, extra)

# --- Push to Google Calendar ---
push(final)
