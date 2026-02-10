"""Decomposes a project spec into a task DAG using Claude."""

import json
import logging
import re

import anthropic

from app.prompts.meta_planner import META_PLANNER_SYSTEM, meta_planner_user

logger = logging.getLogger(__name__)

DEFAULT_AGENTS = [
    {
        "name": "Builder Bot",
        "role": "builder",
        "persona": "A friendly robot who loves building things and explaining how they work.",
    },
    {
        "name": "Test Bot",
        "role": "tester",
        "persona": "A careful detective who checks everything twice to make sure it works.",
    },
    {
        "name": "Review Bot",
        "role": "reviewer",
        "persona": "A helpful teacher who looks at code and suggests ways to make it even better.",
    },
]


class MetaPlanner:
    """Takes a ProjectSpec and produces a list of tasks with dependencies."""

    def __init__(self) -> None:
        self._client = anthropic.AsyncAnthropic()

    async def plan(self, spec: dict) -> dict:
        """Generate a task plan from a project spec."""
        if not spec.get("agents"):
            spec = {**spec, "agents": DEFAULT_AGENTS}

        spec_json = json.dumps(spec, indent=2)
        user_msg = meta_planner_user(spec_json)

        response = await self._client.messages.create(
            model="claude-opus-4-6",
            system=META_PLANNER_SYSTEM,
            messages=[{"role": "user", "content": user_msg}],
            max_tokens=4096,
        )

        text = self._extract_text(response)
        plan = self._parse_json(text)

        if plan is None:
            logger.warning("First JSON parse failed, retrying with follow-up message")
            plan = await self._retry_parse(user_msg, text)

        self._validate(plan)
        return plan

    async def _retry_parse(self, original_user_msg: str, bad_response: str) -> dict:
        """Retry with a follow-up message asking for valid JSON."""
        response = await self._client.messages.create(
            model="claude-opus-4-6",
            system=META_PLANNER_SYSTEM,
            messages=[
                {"role": "user", "content": original_user_msg},
                {"role": "assistant", "content": bad_response},
                {
                    "role": "user",
                    "content": (
                        "Your response was not valid JSON. "
                        "Please output ONLY the JSON object with no markdown code fences "
                        "or commentary. Just the raw JSON."
                    ),
                },
            ],
            max_tokens=4096,
        )
        text = self._extract_text(response)
        plan = self._parse_json(text)
        if plan is None:
            raise ValueError("Meta-planner failed to produce valid JSON after retry")
        return plan

    def _extract_text(self, response: anthropic.types.Message) -> str:
        """Extract text content from an Anthropic response."""
        for block in response.content:
            if block.type == "text":
                return block.text
        raise ValueError("No text content in meta-planner response")

    def _parse_json(self, text: str) -> dict | None:
        """Parse JSON from text, stripping markdown fences if present."""
        cleaned = text.strip()
        fence_match = re.search(r"```(?:json)?\s*\n?(.*?)```", cleaned, re.DOTALL)
        if fence_match:
            cleaned = fence_match.group(1).strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            return None

    def _validate(self, plan: dict) -> None:
        """Validate the plan structure."""
        if not isinstance(plan, dict):
            raise ValueError("Plan must be a JSON object")
        if "tasks" not in plan:
            raise ValueError("Plan must contain 'tasks' key")
        if "agents" not in plan:
            raise ValueError("Plan must contain 'agents' key")
        if not isinstance(plan["tasks"], list) or len(plan["tasks"]) == 0:
            raise ValueError("Plan must have at least one task")

        task_ids = {t["id"] for t in plan["tasks"]}
        agent_names = {a["name"] for a in plan["agents"]}

        for task in plan["tasks"]:
            if "id" not in task:
                raise ValueError(f"Task missing 'id': {task}")
            if "dependencies" not in task:
                raise ValueError(f"Task missing 'dependencies': {task.get('id')}")
            for dep in task["dependencies"]:
                if dep not in task_ids:
                    raise ValueError(
                        f"Task {task['id']} depends on unknown task {dep}"
                    )
            if task.get("agent_name") and task["agent_name"] not in agent_names:
                raise ValueError(
                    f"Task {task['id']} assigned to unknown agent {task['agent_name']}"
                )
