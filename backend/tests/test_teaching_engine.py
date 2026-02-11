"""Tests for TeachingEngine trigger mapping and dedup."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.teaching_engine import TeachingEngine


class TestTeachingEngine:
    @pytest.fixture
    def engine(self):
        return TeachingEngine()

    async def test_plan_ready_returns_decomposition(self, engine):
        moment = await engine.get_moment("plan_ready", "Breaking into 5 tasks")
        assert moment is not None
        assert moment["concept"] == "decomposition"
        assert "headline" in moment

    async def test_first_commit(self, engine):
        moment = await engine.get_moment("commit_created", "Initial commit")
        assert moment is not None
        assert moment["concept"] == "source_control"
        assert "saving" in moment["headline"].lower() or "helpers" in moment["headline"].lower()

    async def test_second_commit_different(self, engine):
        await engine.get_moment("commit_created", "First")
        moment = await engine.get_moment("commit_created", "Second")
        assert moment is not None
        assert "multiple" in moment["headline"].lower() or "history" in moment["headline"].lower()

    async def test_dedup_prevents_repeat(self, engine):
        first = await engine.get_moment("plan_ready", "")
        assert first is not None
        second = await engine.get_moment("plan_ready", "")
        assert second is None

    async def test_unknown_event_returns_none(self, engine):
        moment = await engine.get_moment("unknown_event", "")
        assert moment is None

    async def test_test_pass(self, engine):
        moment = await engine.get_moment("test_result_pass", "3/3 passing")
        assert moment is not None
        assert moment["concept"] == "testing"

    async def test_test_fail(self, engine):
        moment = await engine.get_moment("test_result_fail", "1/3 failing")
        assert moment is not None
        assert moment["concept"] == "testing"

    async def test_tester_completed(self, engine):
        moment = await engine.get_moment("tester_task_completed", "")
        assert moment is not None
        assert moment["concept"] == "testing"

    async def test_reviewer_completed(self, engine):
        moment = await engine.get_moment("reviewer_task_completed", "")
        assert moment is not None
        assert moment["concept"] == "code_review"

    async def test_get_shown_concepts(self, engine):
        await engine.get_moment("plan_ready", "")
        shown = engine.get_shown_concepts()
        assert len(shown) == 1
        assert "decomposition:task_breakdown" in shown

    async def test_mark_shown(self, engine):
        engine.mark_shown("decomposition:task_breakdown")
        moment = await engine.get_moment("plan_ready", "")
        assert moment is None

    async def test_moment_is_copy(self, engine):
        m1 = await engine.get_moment("test_result_pass", "")
        assert m1 is not None
        m1["headline"] = "MODIFIED"
        # Reset engine and get again - but it's deduped, so test with fresh engine
        engine2 = TeachingEngine()
        m2 = await engine2.get_moment("test_result_pass", "")
        assert m2["headline"] != "MODIFIED"
