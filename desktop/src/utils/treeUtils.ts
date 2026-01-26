import { TreeNode } from "../hooks/useTauriCommands";

export function findNode(nodes: TreeNode[], id: string): TreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNode(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function removeNode(nodes: TreeNode[], id: string): TreeNode[] {
  return nodes.reduce((acc: TreeNode[], node) => {
    if (node.id === id) return acc;
    if (node.children) {
      return [...acc, { ...node, children: removeNode(node.children, id) }];
    }
    return [...acc, node];
  }, []);
}

export function insertNode(nodes: TreeNode[], parentId: string, nodeToInsert: TreeNode, index?: number): TreeNode[] {
  if (parentId === "root") {
    const newNodes = [...nodes];
    if (typeof index === 'number') {
      newNodes.splice(index, 0, nodeToInsert);
    } else {
      newNodes.push(nodeToInsert);
    }
    return newNodes;
  }

  return nodes.map(node => {
    if (node.id === parentId) {
      const newChildren = node.children ? [...node.children] : [];
      if (typeof index === 'number') {
        newChildren.splice(index, 0, nodeToInsert);
      } else {
        newChildren.push(nodeToInsert);
      }
      return { ...node, children: newChildren };
    }
    if (node.children) {
      return { ...node, children: insertNode(node.children, parentId, nodeToInsert, index) };
    }
    return node;
  });
}

// Flatten tree to a list of items for DragOverlay if needed, or just finding parents
export function findParent(nodes: TreeNode[], id: string, parentId: string | null = "root"): string | null {
  for (const node of nodes) {
    if (node.id === id) return parentId;
    if (node.children) {
      const found = findParent(node.children, id, node.id);
      if (found) return found;
    }
  }
  return null;
}
