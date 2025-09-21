# Project Cleanup and Restructuring Plan

This document outlines the steps to clean up, organize, and unify the SyncMark project.

## 1. Consolidate Browser Extensions

- **Action:** Merge the `SyncMarks_chrome`, `SyncMarks_edge`, and `SyncMarks_firefox` directories into a single `extension` directory.
- **Details:**
    - Create a new `extension/src` directory for the unified source code.
    - Move the common files (`background.js`, `popup.html`, `popup.js`, `popup.css`, and `icons/`) to `extension/src`.
    - Create separate `manifest.json` files for each browser (e.g., `extension/manifest-chrome.json`, `extension/manifest-edge.json`) to handle browser-specific configurations.
    - Update the build scripts to generate the appropriate extension package for each browser.

## 2. Refactor Backend and Native Host

- **Action:** Consolidate the `SyncMark_Helpers` and `backend` directories into a single `backend` service.
- **Details:**
    - Move the core logic from `SyncMark_Helpers/syncmark_uni` and `backend/modules` to a new `backend/src` directory.
    - Unify the native host implementation, ensuring a single `native_host.py` and `service.py`.
    - Merge the configuration files (`native_host_manifest_chrome.json`, `native_host_manifest_edge.json`) into a single, configurable template.
    - Remove the redundant `.ai-memory` directory from `SyncMark_Helpers`.

## 3. Organize Scripts

- **Action:** Centralize all build, configuration, and testing scripts in the `scripts` directory.
- **Details:**
    - Move the scripts from `SyncMark_Helpers` (e.g., `build_unified.py`, `setup_all_browsers.py`) to the `scripts` directory.
    - Update the scripts to reflect the new project structure.
    - Ensure that all scripts are executable and properly documented.

## 4. Clean Up Root Directory

- **Action:** Remove all unnecessary files and directories from the project root.
- **Details:**
    - Delete the `SyncMarks_chrome`, `SyncMarks_edge`, `SyncMarks_firefox`, and `SyncMark_Helpers` directories after their contents have been merged.
    - Remove any temporary or backup files.

## 5. Testing and Validation

- **Action:** Run all tests to ensure that the refactored project works correctly.
- **Details:**
    - Execute the tests in the `tests` directory.
    - Test the communication between the unified browser extension and the backend service for all supported browsers.
    - Verify that the bookmarks are synchronized correctly.