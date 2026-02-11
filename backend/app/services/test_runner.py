"""Runs tests for generated projects."""

import asyncio
import json
import logging
import os
import re
import tempfile

logger = logging.getLogger(__name__)


class TestRunner:
    """Executes test suites and reports results."""

    async def run_tests(self, project_path: str) -> dict:
        """Run pytest on the project and return structured results.

        Returns:
            dict with keys:
                tests: list of {test_name: str, passed: bool, details: str}
                passed: int
                failed: int
                total: int
                coverage_pct: float | None
                coverage_details: dict (CoverageReport) | None
        """
        tests_dir = os.path.join(project_path, "tests")
        if not os.path.isdir(tests_dir):
            return {
                "tests": [],
                "passed": 0,
                "failed": 0,
                "total": 0,
                "coverage_pct": None,
                "coverage_details": None,
            }

        # Build pytest command
        cmd = ["python", "-m", "pytest", tests_dir, "-v", "--tb=short"]

        # Try coverage if pytest-cov is available
        cov_json_path = None
        src_dir = os.path.join(project_path, "src")
        if os.path.isdir(src_dir):
            cov_json_path = os.path.join(tempfile.mkdtemp(), "coverage.json")
            cmd.extend([
                f"--cov={src_dir}",
                f"--cov-report=json:{cov_json_path}",
                "--cov-report=",
            ])

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=project_path,
            )
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=120
            )
        except asyncio.TimeoutError:
            return {
                "tests": [{"test_name": "pytest", "passed": False, "details": "Test run timed out"}],
                "passed": 0,
                "failed": 1,
                "total": 1,
                "coverage_pct": None,
                "coverage_details": None,
            }
        except FileNotFoundError:
            return {
                "tests": [{"test_name": "pytest", "passed": False, "details": "pytest not found"}],
                "passed": 0,
                "failed": 1,
                "total": 1,
                "coverage_pct": None,
                "coverage_details": None,
            }

        stdout = stdout_bytes.decode("utf-8", errors="replace")
        stderr = stderr_bytes.decode("utf-8", errors="replace")

        # Check for import errors (Gap 16)
        if "ModuleNotFoundError" in stderr or "ImportError" in stderr:
            error_match = re.search(r"(ModuleNotFoundError|ImportError): (.+)", stderr)
            error_msg = error_match.group(0) if error_match else "Import error in test code"
            return {
                "tests": [{"test_name": "import_check", "passed": False, "details": error_msg}],
                "passed": 0,
                "failed": 1,
                "total": 1,
                "coverage_pct": None,
                "coverage_details": None,
            }

        # Parse verbose output: lines like "tests/test_foo.py::test_bar PASSED"
        tests = []
        passed_count = 0
        failed_count = 0

        for line in stdout.splitlines():
            # Match pytest verbose format: path::test_name STATUS
            match = re.match(r"(.+?)\s+(PASSED|FAILED|ERROR|SKIPPED)", line)
            if match:
                test_name = match.group(1).strip()
                status = match.group(2)
                is_passed = status == "PASSED"
                tests.append({
                    "test_name": test_name,
                    "passed": is_passed,
                    "details": status,
                })
                if is_passed:
                    passed_count += 1
                else:
                    failed_count += 1

        # Parse coverage if available
        coverage_pct = None
        coverage_details = None
        if cov_json_path and os.path.isfile(cov_json_path):
            try:
                with open(cov_json_path, "r") as f:
                    cov_data = json.load(f)
                totals = cov_data.get("totals", {})
                coverage_pct = totals.get("percent_covered", None)
                # Build CoverageReport
                files_report = {}
                for filepath, file_data in cov_data.get("files", {}).items():
                    summary = file_data.get("summary", {})
                    files_report[filepath] = {
                        "statements": summary.get("num_statements", 0),
                        "covered": summary.get("covered_lines", 0),
                        "percentage": summary.get("percent_covered", 0),
                    }
                coverage_details = {
                    "total_statements": totals.get("num_statements", 0),
                    "covered_statements": totals.get("covered_lines", 0),
                    "files": files_report,
                }
            except Exception:
                logger.debug("Failed to parse coverage JSON", exc_info=True)

        total = passed_count + failed_count
        return {
            "tests": tests,
            "passed": passed_count,
            "failed": failed_count,
            "total": total,
            "coverage_pct": coverage_pct,
            "coverage_details": coverage_details,
        }
