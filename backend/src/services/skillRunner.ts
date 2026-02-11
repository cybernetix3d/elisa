/** Executes a SkillPlan step-by-step, handling user interaction and agent dispatch. */

import type {
  SkillPlan,
  SkillStep,
  SkillContext,
  SkillSpec,
} from '../models/skillPlan.js';
import type { AgentRunner } from './agentRunner.js';

type SendEvent = (event: Record<string, any>) => Promise<void>;

const MAX_DEPTH = 10;

export class SkillRunner {
  private send: SendEvent;
  private allSkills: SkillSpec[];
  private agentRunner: AgentRunner;
  private questionResolvers = new Map<string, (answers: Record<string, any>) => void>();
  private callStack: string[] = [];

  constructor(
    send: SendEvent,
    allSkills: SkillSpec[],
    agentRunner: AgentRunner,
  ) {
    this.send = send;
    this.allSkills = allSkills;
    this.agentRunner = agentRunner;
  }

  async execute(plan: SkillPlan, parentContext?: SkillContext): Promise<string> {
    // Cycle detection
    if (this.callStack.includes(plan.skillId)) {
      const msg = `Cycle detected: skill "${plan.skillName}" calls itself (stack: ${this.callStack.join(' -> ')})`;
      await this.send({ type: 'skill_error', skill_id: plan.skillId, message: msg });
      throw new Error(msg);
    }
    if (this.callStack.length >= MAX_DEPTH) {
      const msg = `Max skill depth (${MAX_DEPTH}) exceeded`;
      await this.send({ type: 'skill_error', skill_id: plan.skillId, message: msg });
      throw new Error(msg);
    }

    this.callStack.push(plan.skillId);

    const context: SkillContext = {
      entries: {},
      parentContext,
    };

    await this.send({
      type: 'skill_started',
      skill_id: plan.skillId,
      skill_name: plan.skillName,
    });

    let result = '';

    try {
      result = await this.executeSteps(plan.steps, plan.skillId, context);

      await this.send({
        type: 'skill_completed',
        skill_id: plan.skillId,
        result,
      });
    } catch (err: any) {
      await this.send({
        type: 'skill_error',
        skill_id: plan.skillId,
        message: String(err.message || err),
      });
      throw err;
    } finally {
      this.callStack.pop();
    }

    return result;
  }

  respondToQuestion(stepId: string, answers: Record<string, any>): void {
    const resolver = this.questionResolvers.get(stepId);
    if (resolver) {
      resolver(answers);
      this.questionResolvers.delete(stepId);
    }
  }

  private async executeSteps(
    steps: SkillStep[],
    skillId: string,
    context: SkillContext,
  ): Promise<string> {
    let result = '';

    for (const step of steps) {
      await this.send({
        type: 'skill_step',
        skill_id: skillId,
        step_id: step.id,
        step_type: step.type,
        status: 'started',
      });

      try {
        switch (step.type) {
          case 'ask_user': {
            const questions = [{
              question: resolveTemplate(step.question, context),
              header: step.header,
              options: step.options.map(o => ({
                label: resolveTemplate(o, context),
                description: '',
              })),
              multiSelect: false,
            }];

            await this.send({
              type: 'skill_question',
              skill_id: skillId,
              step_id: step.id,
              questions,
            });

            // Block until answer arrives
            const answers = await new Promise<Record<string, any>>((resolve) => {
              this.questionResolvers.set(step.id, resolve);
            });

            // Store the answer -- use header as key, or fall back to storeAs
            const answer = answers[step.header] ?? Object.values(answers)[0] ?? '';
            context.entries[step.storeAs] = answer;
            break;
          }

          case 'branch': {
            const value = resolveContextKey(step.contextKey, context);
            if (value === step.matchValue) {
              const branchResult = await this.executeSteps(step.thenSteps, skillId, context);
              if (branchResult) result = branchResult;
            }
            break;
          }

          case 'invoke_skill': {
            const targetSkill = this.allSkills.find(s => s.id === step.skillId);
            if (!targetSkill) {
              throw new Error(`Skill not found: ${step.skillId}`);
            }

            let skillResult: string;
            if (targetSkill.category === 'composite' && targetSkill.workspace) {
              // Interpret and recursively execute
              const childPlan = this.interpretWorkspaceOnBackend(targetSkill);
              skillResult = await this.execute(childPlan, context);
            } else {
              // Simple skill -- run as agent with its prompt
              const resolvedPrompt = resolveTemplate(targetSkill.prompt, context);
              const agentResult = await this.agentRunner.execute({
                taskId: `skill-${step.id}`,
                prompt: resolvedPrompt,
                systemPrompt: `You are executing a skill called "${targetSkill.name}".`,
                onOutput: async () => {},
                workingDir: process.cwd(),
              });
              skillResult = agentResult.summary;
            }

            context.entries[step.storeAs] = skillResult;
            break;
          }

          case 'run_agent': {
            const resolvedPrompt = resolveTemplate(step.prompt, context);

            await this.send({
              type: 'skill_output',
              skill_id: skillId,
              step_id: step.id,
              content: `Running agent: ${resolvedPrompt.slice(0, 100)}...`,
            });

            const agentResult = await this.agentRunner.execute({
              taskId: `skill-${step.id}`,
              prompt: resolvedPrompt,
              systemPrompt: 'You are an AI agent executing a step in a composite skill workflow. Complete the task described in the prompt.',
              onOutput: async (_taskId: string, content: string) => {
                await this.send({
                  type: 'skill_output',
                  skill_id: skillId,
                  step_id: step.id,
                  content,
                });
              },
              workingDir: process.cwd(),
            });

            context.entries[step.storeAs] = agentResult.summary;
            break;
          }

          case 'set_context': {
            context.entries[step.key] = resolveTemplate(step.value, context);
            break;
          }

          case 'output': {
            result = resolveTemplate(step.template, context);
            await this.send({
              type: 'skill_output',
              skill_id: skillId,
              step_id: step.id,
              content: result,
            });
            break;
          }
        }

        await this.send({
          type: 'skill_step',
          skill_id: skillId,
          step_id: step.id,
          step_type: step.type,
          status: 'completed',
        });
      } catch (err: any) {
        await this.send({
          type: 'skill_step',
          skill_id: skillId,
          step_id: step.id,
          step_type: step.type,
          status: 'failed',
        });
        throw err;
      }
    }

    return result;
  }

  /** Interpret a composite skill's workspace JSON into a SkillPlan on the backend.
   *  This is a simplified version of the frontend's skillInterpreter -- same logic, no Blockly dependency. */
  private interpretWorkspaceOnBackend(skill: SkillSpec): SkillPlan {
    const ws = skill.workspace as any;
    const topBlocks = ws?.blocks?.blocks ?? [];
    const startBlock = topBlocks.find((b: any) => b.type === 'skill_flow_start');
    if (!startBlock) return { skillId: skill.id, skillName: skill.name, steps: [] };

    const chain = walkNextChain(startBlock);
    const steps: SkillStep[] = [];
    let counter = 0;

    function nextId(): string { return `step-${++counter}`; }

    function interpretBlock(block: any): SkillStep | null {
      switch (block.type) {
        case 'skill_ask_user': {
          const optionsRaw = (block.fields?.OPTIONS as string) ?? '';
          return {
            id: block.id ?? nextId(),
            type: 'ask_user',
            question: (block.fields?.QUESTION as string) ?? '',
            header: (block.fields?.HEADER as string) ?? '',
            options: optionsRaw.split(',').map((o: string) => o.trim()).filter(Boolean),
            storeAs: (block.fields?.STORE_AS as string) ?? '',
          };
        }
        case 'skill_branch_if': {
          const inputBlock = block.inputs?.THEN_BLOCKS?.block;
          const thenChain = inputBlock ? walkNextChain(inputBlock) : [];
          const thenSteps = thenChain.map(interpretBlock).filter((s: any): s is SkillStep => s !== null);
          return {
            id: block.id ?? nextId(),
            type: 'branch',
            contextKey: (block.fields?.CONTEXT_KEY as string) ?? '',
            matchValue: (block.fields?.MATCH_VALUE as string) ?? '',
            thenSteps,
          };
        }
        case 'skill_invoke':
          return {
            id: block.id ?? nextId(),
            type: 'invoke_skill',
            skillId: (block.fields?.SKILL_ID as string) ?? '',
            storeAs: (block.fields?.STORE_AS as string) ?? '',
          };
        case 'skill_run_agent':
          return {
            id: block.id ?? nextId(),
            type: 'run_agent',
            prompt: (block.fields?.PROMPT as string) ?? '',
            storeAs: (block.fields?.STORE_AS as string) ?? '',
          };
        case 'skill_set_context':
          return {
            id: block.id ?? nextId(),
            type: 'set_context',
            key: (block.fields?.KEY as string) ?? '',
            value: (block.fields?.VALUE as string) ?? '',
          };
        case 'skill_output':
          return {
            id: block.id ?? nextId(),
            type: 'output',
            template: (block.fields?.TEMPLATE as string) ?? '',
          };
        default:
          return null;
      }
    }

    // Skip the start block itself
    for (let i = 1; i < chain.length; i++) {
      const step = interpretBlock(chain[i]);
      if (step) steps.push(step);
    }

    return { skillId: skill.id, skillName: skill.name, steps };
  }
}

// -- Helpers --

function walkNextChain(block: any): any[] {
  const chain: any[] = [block];
  let current = block;
  while (current.next?.block) {
    chain.push(current.next.block);
    current = current.next.block;
  }
  return chain;
}

function resolveContextKey(key: string, context: SkillContext): string {
  // Check current context first
  const val = context.entries[key];
  if (val !== undefined) return Array.isArray(val) ? val.join(', ') : val;

  // Walk parent chain
  let parent = context.parentContext;
  while (parent) {
    const pVal = parent.entries[key];
    if (pVal !== undefined) return Array.isArray(pVal) ? pVal.join(', ') : pVal;
    parent = parent.parentContext;
  }

  return '';
}

export function resolveTemplate(template: string, context: SkillContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return resolveContextKey(key, context);
  });
}
