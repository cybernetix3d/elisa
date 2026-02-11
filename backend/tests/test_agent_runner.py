"""Tests for AgentResult token fields and _run_process parsing."""

from app.services.agent_runner import AgentResult


class TestAgentResult:
    def test_defaults(self):
        r = AgentResult(success=True, summary="ok")
        assert r.input_tokens == 0
        assert r.output_tokens == 0
        assert r.cost_usd == 0.0

    def test_with_tokens(self):
        r = AgentResult(success=True, summary="ok", input_tokens=100, output_tokens=50)
        assert r.input_tokens == 100
        assert r.output_tokens == 50
