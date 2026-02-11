"""Tests for TokenTracker per-agent tracking."""

from app.utils.token_tracker import TokenTracker


class TestTokenTracker:
    def test_add_for_agent_accumulates(self):
        t = TokenTracker()
        t.add_for_agent("Sparky", 100, 50, 0.01)
        t.add_for_agent("Sparky", 200, 100, 0.02)
        assert t.input_tokens == 300
        assert t.output_tokens == 150
        assert t.total == 450
        assert t.cost_usd == 0.03

    def test_per_agent_tracking(self):
        t = TokenTracker()
        t.add_for_agent("Sparky", 100, 50)
        t.add_for_agent("Checkers", 200, 100)
        snap = t.snapshot()
        assert snap["per_agent"]["Sparky"] == {"input": 100, "output": 50}
        assert snap["per_agent"]["Checkers"] == {"input": 200, "output": 100}

    def test_snapshot_structure(self):
        t = TokenTracker()
        t.add_for_agent("Sparky", 100, 50, 0.01)
        snap = t.snapshot()
        assert snap["input_tokens"] == 100
        assert snap["output_tokens"] == 50
        assert snap["total"] == 150
        assert snap["cost_usd"] == 0.01
        assert "per_agent" in snap

    def test_add_still_works(self):
        t = TokenTracker()
        t.add(100, 50)
        assert t.total == 150

    def test_empty_snapshot(self):
        t = TokenTracker()
        snap = t.snapshot()
        assert snap["total"] == 0
        assert snap["per_agent"] == {}
