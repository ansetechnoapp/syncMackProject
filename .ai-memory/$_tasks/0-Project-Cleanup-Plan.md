# SyncMark Project - Cleanup Plan
## Objective
Remove unnecessary folders/files while preserving all required resources, with verification via tests.

## Context & Constraints
- Windows environment; paths are absolute.
- Keep: backend/, scripts/, tests/, extension/, SyncMarks_*/ (except their internal _.git), SyncMark_Helpers/ (except useless/ and internal _.git), .ai-memory/.
- Delete: archive/, backup_before_cleanup/, SyncMark_Helpers/useless/, all _.git subfolders in extension and helpers.
- Post-ops: Run tests to validate system integrity. Files <=80 lines.

## Tasks (One-at-a-time, with tests)
1) Identify targets
- Paths:
  - SyncMark_Helpers\useless
  - archive
  - backup_before_cleanup
  - SyncMarks_chrome\_.git
  - SyncMarks_edge\_.git
  - SyncMarks_firefox\_.git
  - SyncMark_Helpers\_.git
- Success: All targets exist and are not referenced by active tests.

2) Backup (optional)
- If desired, zip targets before deletion to external location.
- Success: Zip created (skipped if not required).

3) Delete targets
- Recursively delete listed folders.
- Success: Folders no longer present; project builds/tests unaffected.

4) Post-cleanup verification
- Run: python tests/test_browsers.py; python tests/test_communication.py
- Success: Both exit with code 0 and previous pass criteria remain (Chrome/Edge configured; ping/sync_bookmarks OK).

## Risk & Mitigation
- Risk: Accidental deletion. Mitigation: Limit to clearly redundant directories and validate via tests.

## Exit Criteria
- Targets removed, tests pass, service still operational.