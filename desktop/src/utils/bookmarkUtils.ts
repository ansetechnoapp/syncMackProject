import type { TreeNode } from '../hooks/useTauriCommands';
import type { BookmarkNode } from '../components/BookmarkItem';

/**
 * Aplatit récursivement un arbre de noeuds en liste plate de BookmarkNode.
 */
export function flattenBookmarkTree(nodes: TreeNode[]): BookmarkNode[] {
  let result: BookmarkNode[] = [];
  for (const node of nodes) {
    if (node.id) {
      result.push(node as BookmarkNode);
    }
    if (node.isFolder && node.children) {
      result = [...result, ...flattenBookmarkTree(node.children)];
    }
  }
  return result;
}
