import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  useReactFlow,
} from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import '@xyflow/react/dist/style.css';
import type { Task } from '../../types';

const elk = new ELK();

const NODE_WIDTH = 170;
const NODE_HEIGHT = 50;

const STATUS_COLORS: Record<string, string> = {
  pending: '#9ca3af',
  in_progress: '#3b82f6',
  done: '#22c55e',
  failed: '#ef4444',
};

interface TaskDAGProps {
  tasks: Task[];
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '\u2026' : str;
}

function TaskDAGInner({ tasks }: TaskDAGProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const { fitView } = useReactFlow();

  const elkGraph = useMemo(() => ({
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '20',
      'elk.layered.spacing.nodeNodeBetweenLayers': '30',
    },
    children: tasks.map(t => ({
      id: t.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    })),
    edges: tasks.flatMap(t =>
      t.dependencies.map(dep => ({
        id: `${dep}->${t.id}`,
        sources: [dep],
        targets: [t.id],
      }))
    ),
  }), [tasks]);

  const layoutNodes = useCallback(async () => {
    if (tasks.length === 0) return;
    try {
      const layout = await elk.layout(elkGraph);
      const layoutNodes: Node[] = (layout.children || []).map(node => {
        const task = tasks.find(t => t.id === node.id)!;
        return {
          id: node.id,
          position: { x: node.x || 0, y: node.y || 0 },
          data: {
            label: truncate(task.name, 25),
            agentName: task.agent_name,
            status: task.status,
          },
          style: {
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            background: STATUS_COLORS[task.status] || STATUS_COLORS.pending,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 11,
            display: 'flex',
            flexDirection: 'column' as const,
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px 8px',
            animation: task.status === 'in_progress' ? 'pulse 1.5s infinite' : undefined,
          },
        };
      });

      const layoutEdges: Edge[] = tasks.flatMap(t =>
        t.dependencies.map(dep => ({
          id: `${dep}->${t.id}`,
          source: dep,
          target: t.id,
          markerEnd: { type: 'arrowclosed' as const, color: '#6b7280' },
          style: { stroke: '#6b7280', strokeWidth: 1.5 },
        }))
      );

      setNodes(layoutNodes);
      setEdges(layoutEdges);
      setTimeout(() => fitView({ padding: 0.1 }), 50);
    } catch {
      // Layout failed, skip
    }
  }, [tasks, elkGraph, fitView]);

  useEffect(() => {
    layoutNodes();
  }, [layoutNodes]);

  return (
    <div style={{ height: 200 }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnDoubleClick={false}
        preventScrolling={false}
        fitView
        proOptions={{ hideAttribution: true }}
      />
    </div>
  );
}

export default function TaskDAG({ tasks }: TaskDAGProps) {
  if (tasks.length === 0) return null;
  return (
    <ReactFlowProvider>
      <TaskDAGInner tasks={tasks} />
    </ReactFlowProvider>
  );
}
