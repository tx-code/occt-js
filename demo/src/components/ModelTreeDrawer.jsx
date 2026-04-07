import { useState } from "react";
import { useViewerStore } from "../store/viewerStore";

function TreeNode({ node, depth = 0 }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;
  const geometryIds = Array.isArray(node.geometryIds) ? node.geometryIds : [];
  const hasGeometry = geometryIds.length > 0;
  const isAssembly = node.kind === "assembly" || hasChildren;

  return (
    <div>
      <div
        className="flex items-center gap-1 py-0.5 px-2 hover:bg-zinc-800 rounded cursor-pointer text-xs"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <span className="text-zinc-500 w-3 text-center">{expanded ? "▾" : "▸"}</span>
        ) : (
          <span className="w-3" />
        )}
        <span className={isAssembly ? "text-zinc-400" : "text-cyan-400"}>
          {isAssembly ? "📁" : "📄"}
        </span>
        <span className="truncate text-zinc-300">{node.name || `Node ${node.id || node.nodeId || ""}`}</span>
        {hasGeometry && !isAssembly && (
          <span className="text-zinc-600 text-[10px] ml-auto">{geometryIds.length} geo</span>
        )}
      </div>
      {expanded && hasChildren && node.children.map((child, i) => (
        <TreeNode key={child.id || child.nodeId || i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function ModelTreeDrawer() {
  const model = useViewerStore((s) => s.model);
  const treeOpen = useViewerStore((s) => s.treeOpen);
  const setTreeOpen = useViewerStore((s) => s.setTreeOpen);

  if (!model) return null;

  return (
    <>
      {/* Backdrop */}
      {treeOpen && (
        <div
          className="absolute inset-0 z-30 bg-black/30"
          onClick={() => setTreeOpen(false)}
        />
      )}
      {/* Drawer */}
      <div
        className={`absolute top-10 left-0 bottom-0 z-40 w-full md:w-64 bg-zinc-950/95 border-r border-zinc-800 backdrop-blur-sm transform transition-transform duration-200 ${
          treeOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        data-testid="model-tree"
      >
        <div className="flex items-center justify-between p-3 border-b border-zinc-800">
          <h3 className="text-cyan-400 font-semibold text-sm">Model Tree</h3>
          <button
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
            onClick={() => setTreeOpen(false)}
            data-testid="close-tree"
          >
            ×
          </button>
        </div>
        <div className="overflow-y-auto p-1" style={{ maxHeight: "calc(100vh - 6rem)" }}>
          {(model.rootNodes || []).map((node, i) => (
            <TreeNode key={node.id || node.nodeId || i} node={node} />
          ))}
        </div>
      </div>
    </>
  );
}
