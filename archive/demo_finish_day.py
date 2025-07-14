from datetime import date
import json
from echo.config_loader   import load_config
from echo.scheduler       import build_schedule
from echo.prompt_engine   import build_prompt, parse_response
from echo.plan_utils      import merge_plan

import os, openai
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

cfg      = load_config("config/sample_config.yaml")
partial  = build_schedule(cfg, date.today())

planning_notes = {
    "Priority":    "Deep work on MIR methods",
    "Energy":      "Feeling fresh",
    "Constraints": "Dinner at 18:30",
}

prompt = build_prompt(cfg, partial, planning_notes, date.today())

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
    temperature=0.3,
)
gpt_txt = response.choices[0].message.content

extra  = parse_response(response.choices[0].message.content)
final  = merge_plan(partial, extra)

print("\nFinal plan:")
for b in final:
    print(f"{b.start.strftime('%H:%M')}–{b.end.strftime('%H:%M')}  {b.label}")
    print("   ↳", b.meta.get("note", ""))
    
