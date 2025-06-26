# Echo Config Schema

This document defines the full YAML configuration schema for Echo. It specifies all valid keys, types, and validation rules for user configs.  
**This is the canonical contract. All downstream tooling and rule logic must conform.**

For context, see the [Vision](../01_vision_and_principules.md) and [PRD](../02_echo_prd.md) documents.

---

## Canonical Section Order

All Echo config files **must** use this top-level key order:

1. `defaults`
2. `weekly_schedule`
3. `profiles`

CI will fail if ordering drifts.

---

## ⛓ Schema Table

| YAML Path                          | Type         | Description                                                                 | Validation / Notes                                                                 |
|-----------------------------------|--------------|-----------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `defaults.time_anchors.timezone`  | string       | User’s IANA timezone ID                                                    | e.g., `"America/Chicago"`                                                         |
| `defaults.time_anchors.wake`      | time         | Morning wake time                                                           | Format: `"HH:MM"`                                                                 |
| `defaults.time_anchors.sleep`     | time         | Target bedtime                                                              | Format: `"HH:MM"`                                                                 |
| `defaults.time_anchors.meals.*`   | time_range   | Meal window                                                                 | Format: `"HH:MM–HH:MM"`                                                           |
| `defaults.time_anchors.reading_block` | time_range | Early morning reading window                                               | Required if using `wake`; must match wake block                                  |
| `defaults.time_anchors.evening_wrap` | time        | Evening shutdown prompt                                                    | Optional but recommended                                                          |
| `defaults.time_anchors.wind_down_buffer` | int      | Minutes of pre-sleep wind-down                                             | e.g., `30` minutes                                                                |
| `defaults.block_parameters.default_length` | int    | Default block duration in minutes                                          | Fallback if type not specified                                                    |
| `defaults.block_parameters.min_length`     | int    | Shortest allowable block                                                   | Used during fallback or error recovery                                            |
| `defaults.block_parameters.transition_buffer` | int | Time between blocks (in minutes)                                           | Applied globally unless overridden                                                |
| `defaults.block_parameters.types.<type>.length` | int | Length in minutes for a block type (e.g., deep, admin)                     | Required for all custom types                                                     |
| `defaults.block_parameters.types.<type>.transition_after` | int | Default cooldown after this type                                          | Optional                                                                         |
| `defaults.focus_profiles.weekday.<period>` | string | Primary block type for time of day (e.g., morning, evening)               | Must match one of `block_parameters.types`                                        |
| `defaults.focus_profiles.weekend.<period>` | string | Same as above, for weekends                                                |                                                                                   |
| `defaults.activities.<name>.duration`     | int     | Default duration in minutes                                                | Required for time-scheduled activities                                            |
| `defaults.activities.<name>.cooldown`     | int     | Optional post-activity buffer                                              | Applied after block if present                                                    |
| `defaults.activities.<name>.preferred_time` | string | e.g., `"morning"`, `"afternoon"`                                           | Optional hint for scheduling                                                      |
| `defaults.activities.<name>.earliest_start` | time   | Optional scheduling constraint                                             | Format: `"HH:MM"`                                                                 |
| `defaults.activities.gym.post_therapy_priority` | bool | Should Echo schedule gym after therapy when feasible?                      | Optional                                                                          |
| `defaults.activities.walk.default_after_meals` | bool | If true, walks will be scheduled post-meals                                |                                                                                   |
| `defaults.activities.recovery.include`     | bool    | Whether to include recovery explicitly                                     |                                                                                   |
| `defaults.activities.recovery.preferred_time` | string| Suggested time period                                                      |                                                                                   |
| `defaults.locations.<name>.commute`        | int     | One-way commute time in minutes                                            | `home` should always have `0`                                                     |
| `defaults.locations.<name>.prep_buffer`    | int     | Optional setup buffer before leaving                                       |                                                                                   |
| `defaults.idle_time.allow`                 | bool    | Whether Echo may schedule idle blocks                                      |                                                                                   |
| `defaults.idle_time.strategies`            | list    | Fallback behaviors during idle blocks                                      | e.g., journaling, admin, reflect                                                  |
| `defaults.idle_time.idle_window_cap`       | int     | Max minutes in a row Echo can leave idle                                   |                                                                                   |
| `defaults.idle_time.minimum_rest_ratio`    | float   | Ratio of day that must remain unscheduled                                  | Range: 0–1.0                                                                       |
| `defaults.preferences.morning_person`      | bool    | Should Echo bias toward earlier blocks?                                    |                                                                                   |
| `defaults.preferences.prefers_ride_morning`| bool    | Morning bias for `ride` activity                                           |                                                                                   |
| `defaults.preferences.prefers_gym_afternoon`| bool   | Afternoon bias for `gym` activity                                          |                                                                                   |
| `defaults.preferences.default_recovery_ratio`| float | Target share of day spent recovering                                       | Range: 0–1.0                                                                       |
| `defaults.preferences.preferred_pacing`     | string | `"balanced"` \| `"fast"` \| `"slow"`                                       | Optional pacing strategy                                                          |
| `defaults.preferences.reflection_required`  | bool   | Should Echo enforce end-of-day journaling?                                 |                                                                                   |
| `defaults.ui_options.scaffold_format`       | string | `"hourly"` or `"timeline"`                                                 | Controls output style                                                             |
| `defaults.ui_options.include_context_summary`| bool  | Whether Echo includes the day’s context summary                            |                                                                                   |
| `defaults.ui_options.include_timecode_in_log`| bool  | Whether timecode appears in logs                                           |                                                                                   |
| `defaults.ui_options.log_format`            | string | `"markdown"` recommended                                                   |                                                                                   |
| `defaults.ui_options.verbosity`             | string | `"low"` \| `"medium"` \| `"high"`                                          | Output verbosity                                                                  |
| `defaults.ui_options.daily_log_header`      | string | Header text shown at top of daily log                                      | Plaintext, not Markdown header                                                    |

---

## weekly_schedule

| YAML Path                                      | Type       | Description                                                             | Validation / Notes                                                                 |
|------------------------------------------------|------------|-------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `weekly_schedule.<day>.location`               | string     | One of the `defaults.locations` keys                                    | Required every day                                                                 |
| `weekly_schedule.<day>.anchors[].time`         | time_range | Scheduled fixed task (meeting, therapy)                                 | Overlapping anchors allowed, but Echo will not resolve conflicts automatically     |
| `weekly_schedule.<day>.anchors[].task`         | string     | Task label                                                               | Required                                                                           |
| `weekly_schedule.<day>.anchors[].recurrence`   | string     | `"weekly"`, `"biweekly"`, etc.                                           | Optional—but strongly encouraged for predictability                               |
| `weekly_schedule.<day>.anchors[].first_occurrence` | date   | `"YYYY-MM-DD"`                                                           | Required if `recurrence` is used                                                   |
| `weekly_schedule.<day>.notes`                  | list       | Freeform planning hints                                                  | Optional, plain strings                                                            |

---

## profiles

| YAML Path                              | Type         | Description                                                               | Validation / Notes                                                                 |
|---------------------------------------|--------------|---------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| `profiles.<name>.overrides.<path>`    | varies       | Replaces a value from the `defaults` tree                                 | Must match type and structure of the original path; partial trees are allowed      |

Example:

```yaml
profiles:
  travel:
    overrides:
      time_anchors:
        wake: "06:30"
```

---

## Type Glossary

| Type        | Definition                                 |
|-------------|--------------------------------------------|
| `time`      | 24-hour time string: `"HH:MM"`             |
| `time_range`| Range string: `"HH:MM–HH:MM"`              |
| `date`      | ISO date: `"YYYY-MM-DD"`                   |
| `duration`  | Integer representing minutes               |
| `bool`      | `true` or `false`                          |
| `list`      | YAML list of strings or primitives         |

---
