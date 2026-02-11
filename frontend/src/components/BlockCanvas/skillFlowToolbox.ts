export const skillFlowToolbox = {
  kind: 'categoryToolbox',
  contents: [
    {
      kind: 'category',
      name: 'Skill Flow',
      colour: '315',
      contents: [
        { kind: 'block', type: 'skill_flow_start' },
        { kind: 'block', type: 'skill_ask_user' },
        { kind: 'block', type: 'skill_branch_if' },
        { kind: 'block', type: 'skill_invoke' },
        { kind: 'block', type: 'skill_run_agent' },
        { kind: 'block', type: 'skill_set_context' },
        { kind: 'block', type: 'skill_output' },
      ],
    },
  ],
};
