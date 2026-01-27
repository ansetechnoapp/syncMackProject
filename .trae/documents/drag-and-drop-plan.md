# Drag-and-Drop Implementation Plan for SyncMark Workspaces

## Current Architecture Analysis

### Frontend Implementation (React + dnd-kit)

The current implementation uses `@dnd-kit/core` for drag-and-drop functionality with the following components:

**WorkspacesPanel.tsx:**
- Uses `DndContext` as the main drag-and-drop provider
- Implements `customCollisionDetection` that prioritizes workspace droppables
- Handles drag events through `handleDragStart` and `handleDragEnd`
- Manages state for active drag items and provides visual feedback via `DragOverlay`

**WorkspaceColumn.tsx:**
- Implements droppable zones using `useDroppable` hook
- Provides visual feedback with `isOver` state for drop target highlighting
- Displays workspace bookmarks in a flattened list structure

**BookmarkItem.tsx:**
- Implements draggable items using `useDraggable` hook
- Provides drag handles and visual feedback during drag operations
- Supports both compact and card view modes

### Backend Implementation (Rust)

**workspace.rs:**
- Manages workspace data structures and persistence
- Provides CRUD operations for bookmarks within workspaces
- Implements `add_bookmark_to_workspace` and `remove_bookmark_from_workspace` functions
- Uses atomic file operations for data integrity

**commands.rs:**
- Exposes Tauri commands for frontend-backend communication
- Implements `add_bookmark_to_workspace` and `remove_bookmark_from_workspace` commands
- Provides real-time updates via WebSocket broadcasting

## Current Issues and Obstacles

### 1. Folder Drag-and-Drop Limitations
**Issue:** The current implementation explicitly prevents moving folders between workspaces:
```typescript
if (bookmarkData && bookmarkData.isFolder) {
    console.warn("Moving folders between workspaces not fully supported yet");
    return;
}
```

**Impact:** Users cannot reorganize folder structures across workspaces, limiting organizational flexibility.

### 2. Parent ID Management
**Issue:** When moving bookmarks between workspaces, the parent ID is always reset to root (`"1"`):
```typescript
const payload = { ...cleanBookmark, parentId: '1' };
```

**Impact:** Bookmarks lose their hierarchical position when moved, requiring manual reorganization.

### 3. Visual Feedback Inconsistencies
**Issues:**
- Drop zone highlighting is basic (only `is-over` class)
- No preview of where items will be placed
- No indication of valid/invalid drop targets
- Missing drag preview for complex items

### 4. State Synchronization Challenges
**Issues:**
- Race conditions between add/remove operations
- No rollback mechanism on failure
- Limited error handling and user feedback
- WebSocket updates may arrive out of sequence

### 5. Performance Considerations
**Issues:**
- Full workspace reload after each move operation
- No optimistic UI updates
- Potential memory leaks with event listeners
- Inefficient tree flattening operations

## Proposed Solution Architecture

### Enhanced Frontend Implementation

#### 1. Advanced Drag-and-Drop Features

**Multi-Select Drag Operations:**
```typescript
interface DragSelectionState {
  selectedIds: string[];
  isMultiSelectMode: boolean;
  selectionAnchor: string | null;
}

const [selectionState, setSelectionState] = useState<DragSelectionState>({
  selectedIds: [],
  isMultiSelectMode: false,
  selectionAnchor: null
});
```

**Folder Support with Hierarchy Preservation:**
```typescript
interface FolderMoveData {
  folderId: string;
  bookmarkIds: string[]; // Child bookmarks
  subfolderIds: string[]; // Child folders
  preserveHierarchy: boolean;
}
```

**Enhanced Visual Feedback:**
```typescript
interface DragVisualState {
  dragPreview: React.ReactNode;
  dropIndicator: { position: 'before' | 'after' | 'inside'; targetId: string } | null;
  validDropZones: string[];
  invalidDropZones: string[];
}
```

#### 2. Smart Drop Zone Management

**Dynamic Drop Zone Detection:**
```typescript
const useSmartDropZones = (workspaces: Workspace[]) => {
  const [validDropZones, setValidDropZones] = useState<DropZone[]>([]);
  
  const calculateValidDropZones = (draggedItem: DragItem): DropZone[] => {
    return workspaces.map(workspace => ({
      id: workspace.id,
      type: 'workspace',
      canDrop: canDropItem(draggedItem, workspace),
      restrictions: getDropRestrictions(draggedItem, workspace)
    }));
  };
  
  return { validDropZones, calculateValidDropZones };
};
```

**Contextual Drop Indicators:**
```typescript
const DropIndicator: React.FC<{ position: DropPosition; itemType: string }> = ({ 
  position, 
  itemType 
}) => {
  return (
    <div className={`drop-indicator ${position} ${itemType}`}>
      <div className="drop-line" />
      <div className="drop-icon">{getDropIcon(position, itemType)}</div>
    </div>
  );
};
```

#### 3. Optimistic UI Updates

**Optimistic State Management:**
```typescript
const useOptimisticWorkspace = () => {
  const [optimisticWorkspaces, setOptimisticWorkspaces] = useState<Workspace[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  
  const applyOptimisticUpdate = (operation: MoveOperation) => {
    // Apply immediate UI update
    const updatedWorkspaces = applyMoveOperation(optimisticWorkspaces, operation);
    setOptimisticWorkspaces(updatedWorkspaces);
    
    // Track pending operation
    setPendingOperations(prev => [...prev, {
      id: generateOperationId(),
      operation,
      timestamp: Date.now(),
      status: 'pending'
    }]);
  };
  
  const confirmOperation = (operationId: string) => {
    setPendingOperations(prev => 
      prev.map(op => op.id === operationId ? { ...op, status: 'confirmed' } : op)
    );
  };
  
  const rollbackOperation = (operationId: string) => {
    setPendingOperations(prev => 
      prev.filter(op => op.id !== operationId)
    );
    // Revert optimistic update
    reloadWorkspaces();
  };
  
  return { applyOptimisticUpdate, confirmOperation, rollbackOperation };
};
```

### Enhanced Backend Implementation

#### 1. Atomic Multi-Item Operations

**Batch Move Operations:**
```rust
pub struct BatchMoveOperation {
    pub source_workspace_id: String,
    pub target_workspace_id: String,
    pub operations: Vec<MoveOperation>,
    pub preserve_hierarchy: bool,
}

pub struct MoveOperation {
    pub item_id: String,
    pub item_type: ItemType,
    pub source_parent_id: Option<String>,
    pub target_parent_id: Option<String>,
    pub target_position: Option<usize>,
}

impl WorkspaceManager {
    pub fn batch_move_items(operation: BatchMoveOperation) -> Result<BatchMoveResult, String> {
        let mut source_workspace = Self::load_workspace(&operation.source_workspace_id)?;
        let mut target_workspace = Self::load_workspace(&operation.target_workspace_id)?;
        
        // Validate all operations first
        let validation_result = validate_batch_operations(&operation, &source_workspace, &target_workspace)?;
        
        // Create transaction backup
        let backup = create_transaction_backup(&source_workspace, &target_workspace)?;
        
        // Execute operations atomically
        let execution_result = execute_batch_operations(&operation, &mut source_workspace, &mut target_workspace);
        
        match execution_result {
            Ok(result) => {
                // Save both workspaces
                Self::save_workspace(&source_workspace)?;
                Self::save_workspace(&target_workspace)?;
                
                // Update index
                update_workspaces_index(&source_workspace, &target_workspace)?;
                
                Ok(result)
            }
            Err(e) => {
                // Rollback on failure
                restore_from_backup(backup)?;
                Err(format!("Batch move failed: {}", e))
            }
        }
    }
}
```

#### 2. Enhanced Folder Support

**Recursive Folder Operations:**
```rust
impl WorkspaceManager {
    pub fn move_folder_with_contents(
        source_workspace_id: &str,
        target_workspace_id: &str,
        folder_id: &str,
        preserve_hierarchy: bool,
    ) -> Result<FolderMoveResult, String> {
        let source_workspace = Self::load_workspace(source_workspace_id)?;
        let folder = source_workspace.folders.iter()
            .find(|f| f.id == folder_id)
            .ok_or("Folder not found")?;
        
        // Collect all items in folder hierarchy
        let folder_contents = collect_folder_contents(&source_workspace, folder_id)?;
        
        // Create batch operation for all items
        let batch_op = create_folder_move_operation(
            source_workspace_id,
            target_workspace_id,
            folder,
            folder_contents,
            preserve_hierarchy
        )?;
        
        Self::batch_move_items(batch_op)
    }
    
    fn collect_folder_contents(workspace: &Workspace, folder_id: &str) -> Result<FolderContents, String> {
        let mut contents = FolderContents::default();
        
        // Find direct children
        let direct_bookmarks = workspace.bookmarks.iter()
            .filter(|b| b.parent_id == folder_id)
            .cloned()
            .collect();
            
        let direct_folders = workspace.folders.iter()
            .filter(|f| f.parent_id.as_deref() == Some(folder_id))
            .cloned()
            .collect();
        
        contents.bookmarks.extend(direct_bookmarks);
        contents.folders.extend(direct_folders);
        
        // Recursively collect subfolder contents
        for folder in &direct_folders {
            let sub_contents = collect_folder_contents(workspace, &folder.id)?;
            contents.bookmarks.extend(sub_contents.bookmarks);
            contents.folders.extend(sub_contents.folders);
        }
        
        Ok(contents)
    }
}
```

#### 3. Advanced Conflict Resolution

**Conflict Detection and Resolution:**
```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MoveConflict {
    pub conflict_id: String,
    pub conflict_type: ConflictType,
    pub source_item: Option<WorkspaceItem>,
    pub target_item: Option<WorkspaceItem>,
    pub suggested_resolution: ConflictResolution,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConflictType {
    DuplicateUrl { url: String },
    NameCollision { name: String },
    PermissionViolation { reason: String },
    HierarchyConflict { details: String },
}

impl WorkspaceManager {
    pub fn detect_move_conflicts(
        operation: &BatchMoveOperation,
        source_workspace: &Workspace,
        target_workspace: &Workspace,
    ) -> Result<Vec<MoveConflict>, String> {
        let mut conflicts = Vec::new();
        
        for op in &operation.operations {
            // Check for duplicate URLs
            if let Some(conflict) = check_duplicate_url_conflict(op, target_workspace)? {
                conflicts.push(conflict);
            }
            
            // Check for name collisions
            if let Some(conflict) = check_name_collision_conflict(op, target_workspace)? {
                conflicts.push(conflict);
            }
            
            // Check hierarchy constraints
            if let Some(conflict) = check_hierarchy_conflict(op, source_workspace, target_workspace)? {
                conflicts.push(conflict);
            }
        }
        
        Ok(conflicts)
    }
}
```

### Real-time Synchronization

#### WebSocket Protocol Extensions

**Enhanced Message Types:**
```typescript
interface DragStartMessage {
  type: 'drag_start';
  payload: {
    item_id: string;
    item_type: 'bookmark' | 'folder';
    source_workspace_id: string;
    user_id: string;
    timestamp: number;
  };
}

interface DragEndMessage {
  type: 'drag_end';
  payload: {
    item_id: string;
    source_workspace_id: string;
    target_workspace_id: string;
    success: boolean;
    conflicts?: MoveConflict[];
    timestamp: number;
  };
}

interface WorkspaceLockMessage {
  type: 'workspace_lock';
  payload: {
    workspace_id: string;
    locked_by: string;
    lock_type: 'read' | 'write';
    expires_at: number;
  };
}
```

#### Conflict Resolution UI

**Interactive Conflict Resolution:**
```typescript
interface ConflictResolverProps {
  conflicts: MoveConflict[];
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({ conflicts, onResolve, onCancel }) => {
  const [resolutions, setResolutions] = useState<ConflictResolution[]>([]);
  
  return (
    <div className="conflict-resolver-modal">
      <div className="conflict-list">
        {conflicts.map(conflict => (
          <ConflictItem
            key={conflict.conflict_id}
            conflict={conflict}
            onResolutionChange={(resolution) => updateResolution(conflict.conflict_id, resolution)}
          />
        ))}
      </div>
      <div className="conflict-actions">
        <button onClick={() => onResolve(resolutions)}>Apply Resolutions</button>
        <button onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};
```

### Performance Optimizations

#### 1. Virtual Scrolling for Large Workspaces
```typescript
const VirtualizedBookmarkList: React.FC<{ bookmarks: BookmarkNode[] }> = ({ bookmarks }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} className="virtualized-list">
      <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            style={{
              height: `${item.size}px`,
              transform: `translateY(${item.start}px)`,
            }}
          >
            <BookmarkItem node={bookmarks[item.index]} />
          </div>
        ))}
      </div>
    </div>
  );
};
```

#### 2. Debounced Updates
```typescript
const useDebouncedWorkspaceUpdate = (delay: number = 300) => {
  const [pendingUpdates, setPendingUpdates] = useState<WorkspaceUpdate[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const scheduleUpdate = (update: WorkspaceUpdate) => {
    setPendingUpdates(prev => [...prev, update]);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      flushUpdates();
    }, delay);
  };
  
  const flushUpdates = async () => {
    const updates = [...pendingUpdates];
    setPendingUpdates([]);
    
    try {
      await batchUpdateWorkspaces(updates);
    } catch (error) {
      // Re-queue failed updates
      setPendingUpdates(prev => [...updates, ...prev]);
    }
  };
  
  return { scheduleUpdate };
};
```

### Testing Strategy

#### 1. Unit Tests
```typescript
describe('DragAndDropService', () => {
  describe('validateMoveOperation', () => {
    it('should allow valid bookmark move between workspaces', () => {
      const operation = createValidMoveOperation();
      const result = validateMoveOperation(operation);
      expect(result.isValid).toBe(true);
    });
    
    it('should prevent moving folders with invalid hierarchy', () => {
      const operation = createInvalidFolderMove();
      const result = validateMoveOperation(operation);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('hierarchy');
    });
  });
  
  describe('conflict detection', () => {
    it('should detect duplicate URL conflicts', () => {
      const workspace = createWorkspaceWithDuplicateUrls();
      const conflicts = detectMoveConflicts(operation, workspace);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('duplicate_url');
    });
  });
});
```

#### 2. Integration Tests
```typescript
describe('WorkspaceDragAndDrop', () => {
  it('should handle complete drag-and-drop flow', async () => {
    const { user } = render(<WorkspacesPanel />);
    
    // Start dragging
    const bookmark = screen.getByTestId('bookmark-item-1');
    await user.drag(bookmark);
    
    // Drop on target workspace
    const targetWorkspace = screen.getByTestId('workspace-2');
    await user.drop(targetWorkspace);
    
    // Verify move was successful
    await waitFor(() => {
      expect(screen.getByText('Bookmark moved successfully')).toBeInTheDocument();
    });
    
    // Verify workspace counts updated
    expect(screen.getByTestId('workspace-1-count')).toHaveTextContent('4');
    expect(screen.getByTestId('workspace-2-count')).toHaveTextContent('6');
  });
});
```

#### 3. Performance Tests
```typescript
describe('Performance', () => {
  it('should handle large workspace moves efficiently', async () => {
    const largeWorkspace = createWorkspaceWithItems(1000);
    const startTime = performance.now();
    
    await moveMultipleItems(largeWorkspace.bookmarks.slice(0, 100));
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(1000); // Should complete in under 1 second
  });
});
```

### Implementation Roadmap

#### Phase 1: Foundation (Week 1-2)
1. **Enhanced Backend Operations**
   - Implement batch move operations
   - Add comprehensive error handling
   - Create transaction backup system

2. **Frontend Architecture Updates**
   - Refactor drag-and-drop context
   - Implement optimistic updates
   - Add comprehensive error handling

#### Phase 2: Advanced Features (Week 3-4)
1. **Folder Support**
   - Implement recursive folder operations
   - Add hierarchy preservation logic
   - Create folder-specific UI components

2. **Enhanced Visual Feedback**
   - Implement advanced drop indicators
   - Add contextual visual feedback
   - Create smooth animations and transitions

#### Phase 3: Conflict Resolution (Week 5-6)
1. **Conflict Detection System**
   - Implement comprehensive conflict detection
   - Add conflict resolution UI
   - Create automated resolution strategies

2. **Real-time Synchronization**
   - Enhance WebSocket protocol
   - Add workspace locking mechanisms
   - Implement collaborative features

#### Phase 4: Performance & Polish (Week 7-8)
1. **Performance Optimizations**
   - Implement virtual scrolling
   - Add debounced updates
   - Optimize tree operations

2. **Testing & Quality Assurance**
   - Comprehensive test coverage
   - Performance benchmarking
   - Cross-browser compatibility testing

### Monitoring and Analytics

#### Drag-and-Drop Metrics
```typescript
interface DragDropMetrics {
  successfulMoves: number;
  failedMoves: number;
  averageMoveTime: number;
  conflictResolutionTime: number;
  userCancellationRate: number;
  mostCommonConflicts: ConflictType[];
}

const trackDragDropEvent = (event: DragDropEvent) => {
  analytics.track('drag_drop_event', {
    item_type: event.itemType,
    source_workspace: event.sourceWorkspaceId,
    target_workspace: event.targetWorkspaceId,
    success: event.success,
    duration: event.duration,
    conflicts: event.conflicts?.length || 0,
    timestamp: Date.now()
  });
};
```

### Security Considerations

#### 1. Input Validation
```rust
impl WorkspaceManager {
    fn validate_move_operation(operation: &MoveOperation) -> Result<(), String> {
        // Validate item IDs
        if !is_valid_uuid(&operation.item_id) {
            return Err("Invalid item ID format".to_string());
        }
        
        // Validate workspace IDs
        if !is_valid_workspace_id(&operation.target_workspace_id) {
            return Err("Invalid workspace ID format".to_string());
        }
        
        // Check permissions
        if !has_permission(operation.user_id, &operation.target_workspace_id, Permission::Write) {
            return Err("Insufficient permissions".to_string());
        }
        
        Ok(())
    }
}
```

#### 2. Rate Limiting
```rust
use std::collections::HashMap;
use std::time::{Duration, Instant};

struct RateLimiter {
    requests: HashMap<String, Vec<Instant>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    fn check_rate_limit(&mut self, user_id: &str) -> Result<(), String> {
        let now = Instant::now();
        let requests = self.requests.entry(user_id.to_string()).or_default();
        
        // Remove old requests
        requests.retain(|&time| now.duration_since(time) < self.window);
        
        if requests.len() >= self.max_requests {
            return Err("Rate limit exceeded".to_string());
        }
        
        requests.push(now);
        Ok(())
    }
}
```

This comprehensive solution addresses all current limitations while providing a robust, scalable, and user-friendly drag-and-drop experience for workspace management in SyncMark.