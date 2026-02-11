# Block Reference

Complete guide to Elisa's block palette. Blocks snap together on the canvas to produce a [ProjectSpec](api-reference.md#projectspec-schema) that drives the build.

---

## Goal

Define what you're building. Every project needs at least one goal block.

| Block | Fields | ProjectSpec Output |
|-------|--------|--------------------|
| **Project Goal** | `GOAL_TEXT` (text input) | `project.goal`, `project.description` |
| **Project Template** | `TEMPLATE_TYPE` (dropdown) | `project.type` |

**Template types**: `game`, `website`, `hardware`, `story`, `tool`

---

## Requirements

Describe what the project should do.

| Block | Fields | ProjectSpec Output |
|-------|--------|--------------------|
| **Feature** | `FEATURE_TEXT` (text) | `requirements[]` with `type: "feature"` |
| **Constraint** | `CONSTRAINT_TEXT` (text) | `requirements[]` with `type: "constraint"` |
| **When/Then** | `TRIGGER_TEXT`, `ACTION_TEXT` (text) | `requirements[]` with `type: "when_then"` |
| **Has Data** | `DATA_TEXT` (text) | `requirements[]` with `type: "data"` |

**Example**: A "Feature" block with "multiplayer support" produces `{ type: "feature", description: "multiplayer support" }`.

---

## Style

Control the look and personality of the output.

| Block | Fields | ProjectSpec Output |
|-------|--------|--------------------|
| **Look Like** | `STYLE_PRESET` (dropdown) | `style.visual` |
| **Personality** | `PERSONALITY_TEXT` (text) | `style.personality` |

**Style presets**: `fun_colorful`, `clean_simple`, `dark_techy`, `nature`, `space`

---

## Agents

Configure the AI agents that will build your project. If no agent blocks are placed, defaults are used.

| Block | Fields | Role | ProjectSpec Output |
|-------|--------|------|--------------------|
| **Builder Agent** | `AGENT_NAME`, `AGENT_PERSONA` (text) | `builder` | `agents[]` |
| **Tester Agent** | `AGENT_NAME`, `AGENT_PERSONA` (text) | `tester` | `agents[]` |
| **Reviewer Agent** | `AGENT_NAME`, `AGENT_PERSONA` (text) | `reviewer` | `agents[]` |
| **Custom Agent** | `AGENT_NAME`, `AGENT_PERSONA` (text) | `custom` | `agents[]` |

The persona field shapes the agent's behavior. Example: a Builder named "SpeedBot" with persona "writes minimal, fast code" will be prompted accordingly.

---

## Flow

Control execution order. These are container blocks that hold other blocks inside them.

| Block | Inputs | ProjectSpec Output |
|-------|--------|--------------------|
| **First/Then** | `FIRST_BLOCKS`, `THEN_BLOCKS` (statement slots) | `workflow.flow_hints[]` with `type: "sequential"` |
| **At Same Time** | `PARALLEL_BLOCKS` (statement slot) | `workflow.flow_hints[]` with `type: "parallel"` |
| **Keep Improving** | `CONDITION_TEXT` (text) | `workflow.iteration_conditions[]` |
| **Check With Me** | `GATE_DESCRIPTION` (text) | `workflow.human_gates[]` |

**First/Then** runs blocks in the first slot before blocks in the second. **At Same Time** runs contained blocks concurrently. **Keep Improving** loops until a condition is met. **Check With Me** pauses the build and asks the user for approval.

---

## Hardware

Target ESP32 microcontrollers. Adding any hardware block sets `hardware.target` to `"esp32"`.

| Block | Fields | ProjectSpec Output |
|-------|--------|--------------------|
| **LED Control** | `LED_ACTION` (on/off/blink), `LED_SPEED` (slow/normal/fast) | `hardware.components[]` with `type: "led"` |
| **Button Input** | `PIN` (number, default 12), `ACTION_BLOCKS` (statement slot) | `hardware.components[]` with `type: "button"` |
| **Sensor Read** | `SENSOR_TYPE` (temperature/light/motion/custom) | `hardware.components[]` with `type: "sensor"` |
| **LoRa Send** | `MESSAGE` (text), `CHANNEL` (number, default 1) | `hardware.components[]` with `type: "lora_tx"` |
| **LoRa Receive** | `CHANNEL` (number, default 1), `ACTION_BLOCKS` (statement slot) | `hardware.components[]` with `type: "lora_rx"` |
| **Timer Every** | `INTERVAL` (number, default 5s), `ACTION_BLOCKS` (statement slot) | `hardware.components[]` with `type: "timer"` |
| **Buzzer Play** | `FREQUENCY` (Hz, default 1000), `DURATION` (s, default 0.5) | `hardware.components[]` with `type: "buzzer"` |

**Supported boards**: Heltec WiFi LoRa 32 V3 (CP210x), ESP32-S3 Native USB, ESP32 (CH9102).

---

## Deploy

Choose where the built project gets deployed.

| Block | ProjectSpec Output |
|-------|--------------------|
| **Deploy Web** | `deployment.target: "web"` |
| **Deploy ESP32** | `deployment.target: "esp32"` |
| **Deploy Both** | `deployment.target: "both"` |

If no deploy block is placed, defaults to `"preview"`.

---

## Skills

Reusable prompt snippets that extend agent capabilities.

| Block | Fields | ProjectSpec Output |
|-------|--------|--------------------|
| **Use Skill** | `SKILL_ID` (dropdown, dynamically populated) | `skills[]` |

Skills are created in the Skills & Rules modal. Each skill has a name, prompt, and category (`agent`, `feature`, or `style`).

---

## Rules

Trigger-based prompts that activate at specific build phases.

| Block | Fields | ProjectSpec Output |
|-------|--------|--------------------|
| **Use Rule** | `RULE_ID` (dropdown, dynamically populated) | `rules[]` |

Rules are created in the Skills & Rules modal. Each rule has a name, prompt, and trigger (`always`, `on_task_complete`, `on_test_fail`, `before_deploy`).

---

## Example Composition

A simple game project might use:

1. **Project Goal**: "A space invaders game"
2. **Project Template**: `game`
3. **Feature**: "Three lives and a score counter"
4. **Feature**: "Increasing difficulty each wave"
5. **Look Like**: `space`
6. **Builder Agent**: name "GameDev", persona "writes clean HTML5 canvas games"
7. **Tester Agent**: name "QA", persona "tests edge cases thoroughly"
8. **First/Then**: Builder in first slot, Tester in then slot
9. **Check With Me**: "Review the game before deploying"
10. **Deploy Web**

This produces a ProjectSpec with sequential flow, a human gate before deploy, two agents, and a web deployment target.
