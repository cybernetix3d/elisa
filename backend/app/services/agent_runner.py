"""Runs individual AI agents via Claude Code CLI subprocess."""

import asyncio
import json
import logging
import shutil
from dataclasses import dataclass
from typing import Callable, Awaitable

logger = logging.getLogger(__name__)


@dataclass
class AgentResult:
    success: bool
    summary: str
    cost_usd: float = 0.0
    input_tokens: int = 0
    output_tokens: int = 0


class AgentRunner:
    """Executes a single agent task using Claude Code CLI."""

    def __init__(self) -> None:
        self._claude_path = shutil.which("claude") or "claude"

    async def execute(
        self,
        task_id: str,
        prompt: str,
        system_prompt: str,
        on_output: Callable[[str, str], Awaitable[None]],
        working_dir: str,
        timeout: int = 300,
    ) -> AgentResult:
        """Run an agent with the given prompt and return the result.

        Uses asyncio.create_subprocess_exec to spawn the Claude Code CLI
        as a child process. This is NOT shell execution -- it passes
        arguments as a list directly to the executable (no shell injection
        risk). The subprocess streams JSON lines which are parsed for
        agent output.

        Args:
            task_id: The task identifier.
            prompt: The user prompt (passed via -p).
            system_prompt: Appended to Claude Code's default system prompt.
            on_output: Callback(task_id, content) for streaming text output.
            working_dir: Directory where the agent operates.
            timeout: Max seconds before killing the process.
        """
        cmd = [
            self._claude_path,
            "-p", prompt,
            "--output-format", "stream-json",
            "--append-system-prompt", system_prompt,
            "--model", "opus",
            "--permission-mode", "bypassPermissions",
            "--max-turns", "20",
        ]

        try:
            result = await asyncio.wait_for(
                self._run_process(cmd, task_id, on_output, working_dir),
                timeout=timeout,
            )
            return result
        except asyncio.TimeoutError:
            logger.error("Agent timed out for task %s after %ds", task_id, timeout)
            return AgentResult(
                success=False,
                summary=f"Agent timed out after {timeout} seconds",
            )
        except FileNotFoundError:
            logger.error("Claude CLI not found at %s", self._claude_path)
            return AgentResult(
                success=False,
                summary="Claude CLI ('claude') not found. Is it installed and on PATH?",
            )
        except Exception as e:
            logger.error("Agent run failed for task %s: %s", task_id, e)
            return AgentResult(success=False, summary=str(e))

    async def _run_process(
        self,
        cmd: list[str],
        task_id: str,
        on_output: Callable[[str, str], Awaitable[None]],
        working_dir: str,
    ) -> AgentResult:
        """Spawn the child process and process stream-json output."""
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=working_dir,
        )

        accumulated_text = []
        cost_usd = 0.0
        input_tokens = 0
        output_tokens = 0
        final_result = ""
        success = True

        try:
            assert process.stdout is not None
            async for line_bytes in process.stdout:
                line = line_bytes.decode("utf-8", errors="replace").strip()
                if not line:
                    continue

                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue

                msg_type = data.get("type", "")

                if msg_type == "assistant":
                    message = data.get("message", {})
                    for block in message.get("content", []):
                        if block.get("type") == "text":
                            text = block["text"]
                            accumulated_text.append(text)
                            await on_output(task_id, text)

                elif msg_type == "result":
                    final_result = data.get("result", "")
                    cost_usd = data.get("cost_usd", 0.0)
                    input_tokens = data.get("input_tokens", data.get("input_tokens_used", 0))
                    output_tokens = data.get("output_tokens", data.get("output_tokens_used", 0))
                    subtype = data.get("subtype", "")
                    if subtype == "error":
                        success = False
                        if not final_result:
                            final_result = data.get("error", "Unknown error")

        except Exception as e:
            logger.error("Error reading agent output for task %s: %s", task_id, e)
            success = False
            final_result = str(e)

        await process.wait()

        if process.returncode != 0 and success:
            stderr_bytes = await process.stderr.read() if process.stderr else b""
            stderr_text = stderr_bytes.decode("utf-8", errors="replace").strip()
            if stderr_text:
                logger.error("Agent stderr for task %s: %s", task_id, stderr_text)
            success = False
            if not final_result:
                final_result = stderr_text or f"Process exited with code {process.returncode}"

        summary = final_result or "\n".join(accumulated_text[-3:]) or "No output"
        return AgentResult(
            success=success,
            summary=summary,
            cost_usd=cost_usd,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
