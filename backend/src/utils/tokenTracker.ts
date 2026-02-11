/** Tracks token usage across the build session. */

export class TokenTracker {
  inputTokens = 0;
  outputTokens = 0;
  costUsd = 0;
  private perAgent: Map<string, { input: number; output: number }> = new Map();

  add(inputTokens: number, outputTokens: number): void {
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
  }

  addForAgent(
    agentName: string,
    inputTokens: number,
    outputTokens: number,
    costUsd = 0,
  ): void {
    this.inputTokens += inputTokens;
    this.outputTokens += outputTokens;
    this.costUsd += costUsd;

    const prev = this.perAgent.get(agentName) ?? { input: 0, output: 0 };
    this.perAgent.set(agentName, {
      input: prev.input + inputTokens,
      output: prev.output + outputTokens,
    });
  }

  get total(): number {
    return this.inputTokens + this.outputTokens;
  }

  snapshot(): Record<string, any> {
    return {
      input_tokens: this.inputTokens,
      output_tokens: this.outputTokens,
      total: this.total,
      cost_usd: this.costUsd,
      per_agent: Object.fromEntries(this.perAgent),
    };
  }
}
