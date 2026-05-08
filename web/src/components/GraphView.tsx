import { useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Handle,
  Position,
  NodeProps,
  Background,
  Controls,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "dagre";
import { Hex } from "@/decompiler/types";
import { useWorkspace } from "@/store/workspace";

interface PcodeBlock {
  id: number;
  addr: string;
  pcode: string[];
}

interface CfgData {
  nodes: PcodeBlock[];
  edges: { from: number; to: number; type: number }[];
}

const PcodeNode = ({ data }: NodeProps<{ label: string; pcode: string[]; addr: string }>) => {
  return (
    <div className="bg-ink-900 border border-ink-700 rounded shadow-lg text-[10px] font-mono text-ink-100 min-w-[200px]">
      <div className="bg-ink-800 border-b border-ink-700 px-2 py-0.5 text-ink-400 flex justify-between">
        <span>{data.addr}</span>
      </div>
      <div className="p-2 space-y-0.5">
        {data.pcode.map((line, i) => (
          <div key={i} className="whitespace-pre">
            {line}
          </div>
        ))}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-ink-600" />
      <Handle type="source" position={Position.Bottom} className="!bg-ink-600" />
    </div>
  );
};

const nodeTypes = {
  pcode: PcodeNode,
};

const getLayoutedElements = (nodes: any[], edges: any[], direction = "TB") => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: direction, ranksep: 50, nodesep: 50 });

  nodes.forEach((node) => {
    const pcodeCount = node.data.pcode.length;
    const height = 40 + pcodeCount * 15; // Header + lines
    dagreGraph.setNode(node.id, { width: 300, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWithPosition.width / 2,
        y: nodeWithPosition.y - nodeWithPosition.height / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
};

export function GraphView({ addr }: { addr: Hex }) {
  const session = useWorkspace((s) => s.session);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    session
      .cfg(addr)
      .then((json) => {
        if (cancelled) return;
        const data: CfgData = JSON.parse(json);

        const initialNodes = data.nodes.map((n) => ({
          id: n.id.toString(),
          type: "pcode",
          data: { label: `Block ${n.id}`, pcode: n.pcode, addr: n.addr },
          position: { x: 0, y: 0 },
        }));

        const initialEdges = data.edges.map((e, i) => {
          const fromNode = data.nodes.find((n) => n.id === e.from);
          const outCount = data.edges.filter((edge) => edge.from === e.from).length;

          let color = "#94a3b8"; // neutral slate-400
          if (outCount > 1) {
            color = e.type === 0 ? "#ef4444" : "#22c55e"; // red for false, green for true
          }

          return {
            id: `e${i}`,
            source: e.from.toString(),
            target: e.to.toString(),
            style: {
              stroke: color,
              strokeWidth: 2,
            },
          };
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
          initialNodes,
          initialEdges
        );

        setNodes(layoutedNodes);
        setEdges(layoutedEdges);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [session, addr]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-ink-500 animate-pulse">
        Generating graph...
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center text-red-500 p-4 text-center">
        Error generating graph: {error}
      </div>
    );
  }

  return (
    <div className="h-full bg-ink-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#1e293b" gap={20} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
