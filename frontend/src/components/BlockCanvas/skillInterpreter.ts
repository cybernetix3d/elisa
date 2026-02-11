import type { SkillPlan, SkillStep } from '../Skills/types';

interface BlockJson {
  type: string;
  id?: string;
  fields?: Record<string, unknown>;
  inputs?: Record<string, { block: BlockJson }>;
  next?: { block: BlockJson };
}

interface WorkspaceJson {
  blocks?: {
    blocks?: BlockJson[];
  };
}

let stepCounter = 0;

function nextStepId(): string {
  return `step-${++stepCounter}`;
}

function walkNextChain(block: BlockJson): BlockJson[] {
  const chain: BlockJson[] = [block];
  let current = block;
  while (current.next?.block) {
    chain.push(current.next.block);
    current = current.next.block;
  }
  return chain;
}

function walkInputChain(block: BlockJson, inputName: string): BlockJson[] {
  const inputBlock = block.inputs?.[inputName]?.block;
  if (!inputBlock) return [];
  return walkNextChain(inputBlock);
}

function interpretBlock(block: BlockJson): SkillStep | null {
  switch (block.type) {
    case 'skill_ask_user': {
      const question = (block.fields?.QUESTION as string) ?? '';
      const header = (block.fields?.HEADER as string) ?? '';
      const optionsRaw = (block.fields?.OPTIONS as string) ?? '';
      const storeAs = (block.fields?.STORE_AS as string) ?? '';
      const options = optionsRaw.split(',').map(o => o.trim()).filter(Boolean);
      return {
        id: block.id ?? nextStepId(),
        type: 'ask_user',
        question,
        header,
        options,
        storeAs,
      };
    }

    case 'skill_branch_if': {
      const contextKey = (block.fields?.CONTEXT_KEY as string) ?? '';
      const matchValue = (block.fields?.MATCH_VALUE as string) ?? '';
      const thenBlocks = walkInputChain(block, 'THEN_BLOCKS');
      const thenSteps = thenBlocks
        .map(interpretBlock)
        .filter((s): s is SkillStep => s !== null);
      return {
        id: block.id ?? nextStepId(),
        type: 'branch',
        contextKey,
        matchValue,
        thenSteps,
      };
    }

    case 'skill_invoke': {
      const skillId = (block.fields?.SKILL_ID as string) ?? '';
      const storeAs = (block.fields?.STORE_AS as string) ?? '';
      return {
        id: block.id ?? nextStepId(),
        type: 'invoke_skill',
        skillId,
        storeAs,
      };
    }

    case 'skill_run_agent': {
      const prompt = (block.fields?.PROMPT as string) ?? '';
      const storeAs = (block.fields?.STORE_AS as string) ?? '';
      return {
        id: block.id ?? nextStepId(),
        type: 'run_agent',
        prompt,
        storeAs,
      };
    }

    case 'skill_set_context': {
      const key = (block.fields?.KEY as string) ?? '';
      const value = (block.fields?.VALUE as string) ?? '';
      return {
        id: block.id ?? nextStepId(),
        type: 'set_context',
        key,
        value,
      };
    }

    case 'skill_output': {
      const template = (block.fields?.TEMPLATE as string) ?? '';
      return {
        id: block.id ?? nextStepId(),
        type: 'output',
        template,
      };
    }

    default:
      return null;
  }
}

export function interpretSkillWorkspace(
  json: Record<string, unknown>,
  skillId: string,
  skillName: string,
): SkillPlan {
  stepCounter = 0;
  const ws = json as unknown as WorkspaceJson;
  const topBlocks = ws.blocks?.blocks ?? [];

  const startBlock = topBlocks.find(b => b.type === 'skill_flow_start');
  if (!startBlock) {
    return { skillId, skillName, steps: [] };
  }

  const chain = walkNextChain(startBlock);
  // Skip the start block itself
  const steps: SkillStep[] = [];
  for (let i = 1; i < chain.length; i++) {
    const step = interpretBlock(chain[i]);
    if (step) steps.push(step);
  }

  return { skillId, skillName, steps };
}
