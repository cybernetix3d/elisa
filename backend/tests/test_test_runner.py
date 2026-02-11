"""Tests for TestRunner."""

import os
import pytest
import tempfile

from app.services.test_runner import TestRunner


class TestTestRunner:
    @pytest.fixture
    def runner(self):
        return TestRunner()

    async def test_no_tests_dir(self, runner):
        with tempfile.TemporaryDirectory() as tmpdir:
            result = await runner.run_tests(tmpdir)
            assert result["tests"] == []
            assert result["total"] == 0
            assert result["coverage_pct"] is None

    async def test_empty_tests_dir(self, runner):
        with tempfile.TemporaryDirectory() as tmpdir:
            os.makedirs(os.path.join(tmpdir, "tests"))
            result = await runner.run_tests(tmpdir)
            assert result["total"] == 0

    async def test_passing_tests(self, runner):
        with tempfile.TemporaryDirectory() as tmpdir:
            tests_dir = os.path.join(tmpdir, "tests")
            os.makedirs(tests_dir)
            with open(os.path.join(tests_dir, "test_simple.py"), "w") as f:
                f.write("def test_add():\n    assert 1 + 1 == 2\n")
            result = await runner.run_tests(tmpdir)
            assert result["passed"] >= 1
            assert result["failed"] == 0
            assert result["total"] >= 1
            assert any(t["passed"] for t in result["tests"])

    async def test_failing_test(self, runner):
        with tempfile.TemporaryDirectory() as tmpdir:
            tests_dir = os.path.join(tmpdir, "tests")
            os.makedirs(tests_dir)
            with open(os.path.join(tests_dir, "test_fail.py"), "w") as f:
                f.write("def test_bad():\n    assert False\n")
            result = await runner.run_tests(tmpdir)
            assert result["failed"] >= 1
            assert any(not t["passed"] for t in result["tests"])

    async def test_mixed_results(self, runner):
        with tempfile.TemporaryDirectory() as tmpdir:
            tests_dir = os.path.join(tmpdir, "tests")
            os.makedirs(tests_dir)
            with open(os.path.join(tests_dir, "test_mix.py"), "w") as f:
                f.write(
                    "def test_pass():\n    assert True\n\n"
                    "def test_fail():\n    assert False\n"
                )
            result = await runner.run_tests(tmpdir)
            assert result["passed"] >= 1
            assert result["failed"] >= 1
            assert result["total"] >= 2

    async def test_result_structure(self, runner):
        with tempfile.TemporaryDirectory() as tmpdir:
            tests_dir = os.path.join(tmpdir, "tests")
            os.makedirs(tests_dir)
            with open(os.path.join(tests_dir, "test_one.py"), "w") as f:
                f.write("def test_ok():\n    pass\n")
            result = await runner.run_tests(tmpdir)
            assert "tests" in result
            assert "passed" in result
            assert "failed" in result
            assert "total" in result
            assert "coverage_pct" in result
            assert "coverage_details" in result
