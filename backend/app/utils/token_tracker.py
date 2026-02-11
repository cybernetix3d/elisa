"""Tracks token usage across the build session."""


class TokenTracker:
    """Aggregates token counts for cost tracking and display."""

    def __init__(self) -> None:
        self.input_tokens: int = 0
        self.output_tokens: int = 0
        self.cost_usd: float = 0.0
        self._per_agent: dict[str, dict] = {}

    def add(self, input_tokens: int, output_tokens: int) -> None:
        """Add token counts from an API call."""
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens

    def add_for_agent(
        self,
        agent_name: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float = 0.0,
    ) -> None:
        """Add token counts for a specific agent, accumulating both per-agent and global totals."""
        self.input_tokens += input_tokens
        self.output_tokens += output_tokens
        self.cost_usd += cost_usd

        if agent_name not in self._per_agent:
            self._per_agent[agent_name] = {"input": 0, "output": 0}
        self._per_agent[agent_name]["input"] += input_tokens
        self._per_agent[agent_name]["output"] += output_tokens

    @property
    def total(self) -> int:
        """Total tokens used."""
        return self.input_tokens + self.output_tokens

    def snapshot(self) -> dict:
        """Return a snapshot of current token usage."""
        return {
            "input_tokens": self.input_tokens,
            "output_tokens": self.output_tokens,
            "total": self.total,
            "cost_usd": self.cost_usd,
            "per_agent": dict(self._per_agent),
        }
