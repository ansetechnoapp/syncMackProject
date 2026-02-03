use std::net::SocketAddr;
use std::sync::Arc;
use std::time::Duration;
use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::tungstenite::Message;
use chrono::Utc;
use log::{error, info, warn};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::state::{SharedState, ConnectedClient, BroadcastMessage};
use crate::bookmarks::BookmarksManager;
use crate::workspace::WorkspaceManager;

/// Nombre maximum de clients WebSocket autorisés simultanément
const MAX_CLIENTS: usize = 10;

/// Types de messages WebSocket autorisés (validation sécurité)
const ALLOWED_MESSAGE_TYPES: &[&str] = &[
    "ping", "get_status", "sync_bookmarks", "bookmark_created", "bookmark_removed",
    "bookmark_changed", "identify", "folder_created", "folder_removed", "folder_changed",
    // Nouveaux messages pour les workspaces
    "switch_workspace", "get_workspaces",
];

pub async fn start_websocket_server(state: SharedState, port: u16) {
    let addr = format!("127.0.0.1:{}", port);

    let listener = match TcpListener::bind(&addr).await {
        Ok(l) => {
            info!("WebSocket server started on ws://{}", addr);
            l
        }
        Err(e) => {
            error!("Failed to bind WebSocket server: {}", e);
            return;
        }
    };

    // Create broadcast channel for sending messages to all clients
    let (tx, _) = broadcast::channel::<BroadcastMessage>(100);
    *state.websocket_tx.write() = Some(tx.clone());

    loop {
        // Vérifier la limite de connexions avant d'accepter
        let current_clients = state.connected_clients.read().len();
        if current_clients >= MAX_CLIENTS {
            warn!("Max clients reached ({}), waiting before accepting new connections", MAX_CLIENTS);
            tokio::time::sleep(Duration::from_secs(1)).await;
            continue;
        }

        match listener.accept().await {
            Ok((stream, addr)) => {
                // Vérifier que la connexion vient de localhost (sécurité)
                if !addr.ip().is_loopback() {
                    warn!("Rejected non-localhost connection from {}", addr);
                    continue;
                }

                let state = Arc::clone(&state);
                let rx = tx.subscribe();
                tokio::spawn(async move {
                    handle_connection(stream, addr, state, rx).await;
                });
            }
            Err(e) => {
                error!("Failed to accept connection: {}", e);
            }
        }
    }
}

async fn handle_connection(
    stream: TcpStream,
    addr: SocketAddr,
    state: SharedState,
    mut broadcast_rx: broadcast::Receiver<BroadcastMessage>,
) {
    let callback = |req: &tokio_tungstenite::tungstenite::handshake::server::Request, response: tokio_tungstenite::tungstenite::handshake::server::Response| {
        let headers = req.headers();
        let origin = headers.get("Origin")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("unknown");
            
        info!("WebSocket connection attempt from Origin: {}", origin);
        
        // Validation stricte de l'origine
        // Accepter:
        // 1. Extensions Chrome (chrome-extension://...)
        // 2. Localhost (http://localhost:..., http://127.0.0.1:...)
        // 3. Tauri (tauri://...)
        // 4. "unknown" ou null (souvent le cas pour les clients non-navigateur ou certaines configs, mais attention au risque. 
        //    Pour une sécurité max, on devrait rejeter unknown si on est sûr que l'extension envoie l'origine)
        
        let is_valid = origin.starts_with("chrome-extension://") 
            || origin.starts_with("http://localhost") 
            || origin.starts_with("http://127.0.0.1")
            || origin.starts_with("tauri://")
            || origin == "null" // Parfois envoyé par des clients locaux/files
            || origin == "unknown"; // Au cas où pas d'header

        if !is_valid {
            warn!("Rejected WebSocket connection with invalid Origin: {}", origin);
            let mut resp = tokio_tungstenite::tungstenite::handshake::server::ErrorResponse::new(Some("Invalid Origin".to_string()));
            *resp.status_mut() = tokio_tungstenite::tungstenite::http::StatusCode::FORBIDDEN;
            return Err(resp);
        }

        Ok(response)
    };

    let ws_stream = match tokio_tungstenite::accept_hdr_async(stream, callback).await {
        Ok(ws) => ws,
        Err(e) => {
            error!("WebSocket handshake failed for {}: {}", addr, e);
            return;
        }
    };

    let client_id = Uuid::new_v4().to_string();
    info!("New WebSocket connection: {} ({})", client_id, addr);

    let client = ConnectedClient {
        id: client_id.clone(),
        browser: "Unknown".to_string(),
        browser_instance_id: None,
        connected_at: Utc::now(),
        last_activity: Utc::now(),
        workspace_id: None,
    };
    state.add_client(client);

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    let welcome = json!({
        "type": "connected",
        "payload": {
            "client_id": client_id,
            "server_version": "2.1.0",
            "assigned_workspace": null
        }
    });
    let _ = ws_sender.send(Message::Text(welcome.to_string().into())).await;

    loop {
        tokio::select! {
            msg = ws_receiver.next() => {
                match msg {
                    Some(Ok(Message::Text(text))) => {
                        state.update_client_activity(&client_id);
                        let response = process_client_message(&state, &client_id, &text);
                        if let Some(resp) = response {
                            let _ = ws_sender.send(Message::Text(resp.into())).await;
                        }
                    }
                    Some(Ok(Message::Ping(data))) => {
                        let _ = ws_sender.send(Message::Pong(data)).await;
                    }
                    Some(Ok(Message::Close(_))) | None => {
                        info!("Client {} disconnected", client_id);
                        break;
                    }
                    Some(Err(e)) => {
                        warn!("WebSocket error for {}: {}", client_id, e);
                        break;
                    }
                    _ => {}
                }
            }
            broadcast_msg = broadcast_rx.recv() => {
                if let Ok(msg) = broadcast_msg {
                    // Filtrage par workspace : si le message cible un workspace spécifique,
                    // ne l'envoyer qu'aux clients qui y sont assignés
                    if let Some(ref target_ws) = msg.target_workspace_id {
                        let client_ws = state.get_client_workspace(&client_id);
                        if client_ws.as_deref() != Some(target_ws) {
                            continue;
                        }
                    }
                    if ws_sender.send(Message::Text(msg.payload.into())).await.is_err() {
                        break;
                    }
                }
            }
        }
    }

    state.remove_client(&client_id);
    info!("Client {} removed", client_id);
}

/// Valide qu'un message WebSocket est autorisé et bien formé
fn is_valid_message(message: &Value) -> bool {
    let msg_type = match message.get("type").and_then(|v| v.as_str()) {
        Some(t) => t,
        None => return false,
    };

    // Vérifier que le type est autorisé
    if !ALLOWED_MESSAGE_TYPES.contains(&msg_type) {
        return false;
    }

    // Validations spécifiques par type
    match msg_type {
        "sync_bookmarks" => {
            message.get("payload")
                .and_then(|p| p.get("bookmarks"))
                .and_then(|b| b.as_array())
                .is_some()
        }
        "bookmark_created" | "bookmark_changed" => {
            message.get("payload")
                .and_then(|p| p.get("syncId"))
                .and_then(|id| id.as_str())
                .is_some()
        }
        "bookmark_removed" | "folder_removed" => {
            message.get("payload")
                .and_then(|p| p.get("syncId"))
                .and_then(|id| id.as_str())
                .is_some()
        }
        "folder_created" | "folder_changed" => {
            message.get("payload")
                .and_then(|p| p.get("syncId"))
                .and_then(|id| id.as_str())
                .is_some()
        }
        "identify" => {
            message.get("payload")
                .and_then(|p| p.get("browser"))
                .and_then(|b| b.as_str())
                .is_some()
                && message.get("payload")
                    .and_then(|p| p.get("browserInstanceId"))
                    .and_then(|b| b.as_str())
                    .is_some()
        }
        "switch_workspace" => {
            message.get("payload")
                .and_then(|p| p.get("workspaceId"))
                .and_then(|id| id.as_str())
                .is_some()
        }
        // ping, get_status et get_workspaces n'ont pas besoin de payload
        _ => true,
    }
}

fn log_sync_entry(state: &SharedState, operation_type: &str, source: &str, workspace_id: Option<&str>, items_count: usize, success: bool, error_message: Option<&str>) {
    state.sync_log.write().add_entry(
        operation_type,
        source,
        workspace_id,
        items_count,
        success,
        error_message.map(|s| s.to_string()),
    );
}

// Synchronous message processing to avoid holding locks across await
fn process_client_message(
    state: &SharedState,
    client_id: &str,
    text: &str,
) -> Option<String> {
    let message: Value = match serde_json::from_str(text) {
        Ok(v) => v,
        Err(e) => {
            warn!("Invalid JSON from {}: {}", client_id, e);
            return None;
        }
    };

    // Valider le message avant traitement
    if !is_valid_message(&message) {
        warn!("Invalid or unauthorized message from {}: {:?}", client_id, message.get("type"));
        return None;
    }

    let msg_type = message.get("type").and_then(|v| v.as_str()).unwrap_or("");

    match msg_type {
        "ping" => {
            Some(json!({ "type": "pong" }).to_string())
        }

        "get_status" => {
            let status = state.sync_status.read().clone();
            Some(json!({
                "type": "status",
                "payload": status
            }).to_string())
        }

        "sync_bookmarks" => {
            if let Some(payload) = message.get("payload") {
                if let Some(bookmarks_array) = payload.get("bookmarks").and_then(|v| v.as_array()) {
                    state.set_sync_in_progress(true);
                    state.mark_internal_save();

                    let payload_ws_id = payload.get("workspaceId").and_then(|v| v.as_str()).map(|s| s.to_string());
                    let workspace_id = payload_ws_id.or_else(|| state.get_client_workspace(client_id));

                    // Récupérer le nom du navigateur
                    let browser_name = {
                        let clients = state.connected_clients.read();
                        clients.get(client_id)
                            .map(|c| c.browser.clone())
                            .unwrap_or_else(|| "Unknown".to_string())
                    };

                    let browser_instance_id = {
                        let clients = state.connected_clients.read();
                        clients.get(client_id)
                            .and_then(|c| c.browser_instance_id.clone())
                            .unwrap_or_else(|| client_id.to_string())
                    };

                    // Extraire les bookmarks et folders du payload
                    let (incoming_bookmarks, incoming_folders) = BookmarksManager::flatten_chrome_tree(bookmarks_array);

                    if let Some(ws_id) = workspace_id {
                        // Workspace existant : synchroniser avec le workspace
                        let _lock_arc = state.get_workspace_lock(&ws_id);
                let _lock = _lock_arc.lock();
                        match WorkspaceManager::sync_bookmarks_to_workspace(&ws_id, incoming_bookmarks.clone(), incoming_folders.clone()) {
                            Ok(workspace) => {
                                info!("Workspace '{}' synced from {}: {} bookmarks", workspace.name, client_id, workspace.bookmarks.len());
                                state.update_workspace_cache(&workspace);

                                let broadcast = json!({
                                    "type": "bookmarks_updated",
                                    "payload": {
                                        "workspaceId": ws_id,
                                        "bookmarks": &workspace.bookmarks,
                                        "folders": &workspace.folders,
                                        "version": workspace.version,
                                        "source": format!("browser-{}", browser_name)
                                    }
                                });
                                state.send_to_workspace(&ws_id, &broadcast.to_string());

                                state.update_sync_complete(true, None);
                                log_sync_entry(state, "sync_bookmarks", &format!("browser-{}", browser_name), Some(&ws_id), workspace.bookmarks.len(), true, None);

                                // Notifier le frontend
                                let workspaces = WorkspaceManager::list_workspaces();
                                state.emit_to_frontend("workspaces_updated", &workspaces);

                                return Some(json!({
                                    "type": "sync_complete",
                                    "payload": {
                                        "success": true,
                                        "workspaceId": ws_id,
                                        "bookmarks": workspace.bookmarks,
                                        "folders": workspace.folders,
                                        "version": workspace.version
                                    }
                                }).to_string());
                            }
                            Err(e) => {
                                state.update_sync_complete(false, Some(e.clone()));
                                log_sync_entry(state, "sync_bookmarks", &format!("browser-{}", browser_name), Some(&ws_id), 0, false, Some(&e));
                                return Some(json!({
                                    "type": "sync_complete",
                                    "payload": { "success": false, "error": e }
                                }).to_string());
                            }
                        }
                    } else {
                        // Pas de workspace : créer un nouveau workspace à partir des favoris du navigateur
                        match WorkspaceManager::create_workspace_from_browser(
                            &browser_name,
                            &browser_instance_id,
                            incoming_bookmarks.clone(),
                            incoming_folders.clone(),
                        ) {
                            Ok(workspace) => {
                                info!("New workspace '{}' created from {}", workspace.name, browser_name);
                                state.update_workspace_cache(&workspace);
                                state.update_client_workspace(client_id, Some(workspace.id.clone()));

                                state.update_sync_complete(true, None);
                                log_sync_entry(state, "sync_bookmarks", &format!("browser-{}", browser_name), Some(&workspace.id), workspace.bookmarks.len(), true, None);

                                // Notifier le frontend
                                let workspaces = WorkspaceManager::list_workspaces();
                                state.emit_to_frontend("workspaces_updated", &workspaces);

                                return Some(json!({
                                    "type": "workspace_switched",
                                    "payload": {
                                        "workspaceId": workspace.id,
                                        "workspaceName": workspace.name,
                                        "bookmarks": workspace.bookmarks,
                                        "folders": workspace.folders,
                                        "version": workspace.version,
                                        "created": true
                                    }
                                }).to_string());
                            }
                            Err(e) => {
                                state.update_sync_complete(false, Some(e.clone()));
                                log_sync_entry(state, "sync_bookmarks", &format!("browser-{}", browser_name), None, 0, false, Some(&e));
                                return Some(json!({
                                    "type": "sync_complete",
                                    "payload": { "success": false, "error": e }
                                }).to_string());
                            }
                        }
                    }
                }
            }
            None
        }

        "bookmark_created" => {
            if let Some(payload) = message.get("payload") {
                state.mark_internal_save();
                let workspace_id = payload.get("workspaceId").and_then(|v| v.as_str()).map(|s| s.to_string())
                    .or_else(|| state.get_client_workspace(client_id));
                let Some(ws_id) = workspace_id else { return None; };

                let source = {
                    let clients = state.connected_clients.read();
                    clients.get(client_id)
                        .and_then(|c| c.browser_instance_id.clone())
                        .unwrap_or_else(|| client_id.to_string())
                };

                let _lock_arc = state.get_workspace_lock(&ws_id);
                let _lock = _lock_arc.lock();
                if let Ok((workspace, conflict)) = WorkspaceManager::apply_workspace_item_change(&ws_id, "bookmark_created", payload, &source) {
                    state.update_workspace_cache(&workspace);
                    log_sync_entry(state, "bookmark_created", &source, Some(&ws_id), 1, true, None);
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": {
                            "workspaceId": ws_id,
                            "bookmarks": &workspace.bookmarks,
                            "folders": &workspace.folders,
                            "version": workspace.version,
                            "source": format!("browser-{}", source)
                        }
                    });
                    state.send_to_workspace(&ws_id, &broadcast.to_string());

                    if let Some(c) = conflict {
                        let conflict_payload = json!({
                            "workspaceId": ws_id,
                            "conflictId": c.id,
                            "syncId": c.sync_id,
                            "itemType": c.item_type
                        });
                        let msg = json!({
                            "type": "conflict_detected",
                            "payload": &conflict_payload
                        });
                        state.send_to_workspace(&ws_id, &msg.to_string());
                        state.emit_to_frontend("conflict_detected", &conflict_payload);
                    }

                    let workspaces = WorkspaceManager::list_workspaces();
                    state.emit_to_frontend("workspaces_updated", &workspaces);
                }
            }
            None
        }

        "bookmark_removed" => {
            if let Some(payload) = message.get("payload") {
                state.mark_internal_save();
                let workspace_id = payload.get("workspaceId").and_then(|v| v.as_str()).map(|s| s.to_string())
                    .or_else(|| state.get_client_workspace(client_id));
                let Some(ws_id) = workspace_id else { return None; };

                let source = {
                    let clients = state.connected_clients.read();
                    clients.get(client_id)
                        .and_then(|c| c.browser_instance_id.clone())
                        .unwrap_or_else(|| client_id.to_string())
                };

                let _lock_arc = state.get_workspace_lock(&ws_id);
                let _lock = _lock_arc.lock();
                if let Ok((workspace, conflict)) = WorkspaceManager::apply_workspace_item_change(&ws_id, "bookmark_removed", payload, &source) {
                    state.update_workspace_cache(&workspace);
                    log_sync_entry(state, "bookmark_removed", &source, Some(&ws_id), 1, true, None);
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": {
                            "workspaceId": ws_id,
                            "bookmarks": &workspace.bookmarks,
                            "folders": &workspace.folders,
                            "version": workspace.version,
                            "source": format!("browser-{}", source)
                        }
                    });
                    state.send_to_workspace(&ws_id, &broadcast.to_string());

                    if let Some(c) = conflict {
                        let conflict_payload = json!({
                            "workspaceId": ws_id,
                            "conflictId": c.id,
                            "syncId": c.sync_id,
                            "itemType": c.item_type
                        });
                        let msg = json!({ "type": "conflict_detected", "payload": &conflict_payload });
                        state.send_to_workspace(&ws_id, &msg.to_string());
                        state.emit_to_frontend("conflict_detected", &conflict_payload);
                    }

                    let workspaces = WorkspaceManager::list_workspaces();
                    state.emit_to_frontend("workspaces_updated", &workspaces);
                }
            }
            None
        }

        "bookmark_changed" => {
            if let Some(payload) = message.get("payload") {
                state.mark_internal_save();
                let workspace_id = payload.get("workspaceId").and_then(|v| v.as_str()).map(|s| s.to_string())
                    .or_else(|| state.get_client_workspace(client_id));
                let Some(ws_id) = workspace_id else { return None; };

                let source = {
                    let clients = state.connected_clients.read();
                    clients.get(client_id)
                        .and_then(|c| c.browser_instance_id.clone())
                        .unwrap_or_else(|| client_id.to_string())
                };

                let _lock_arc = state.get_workspace_lock(&ws_id);
                let _lock = _lock_arc.lock();
                if let Ok((workspace, conflict)) = WorkspaceManager::apply_workspace_item_change(&ws_id, "bookmark_changed", payload, &source) {
                    state.update_workspace_cache(&workspace);
                    log_sync_entry(state, "bookmark_changed", &source, Some(&ws_id), 1, true, None);
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": {
                            "workspaceId": ws_id,
                            "bookmarks": &workspace.bookmarks,
                            "folders": &workspace.folders,
                            "version": workspace.version,
                            "source": format!("browser-{}", source)
                        }
                    });
                    state.send_to_workspace(&ws_id, &broadcast.to_string());

                    if let Some(c) = conflict {
                        let conflict_payload = json!({
                            "workspaceId": ws_id,
                            "conflictId": c.id,
                            "syncId": c.sync_id,
                            "itemType": c.item_type
                        });
                        let msg = json!({ "type": "conflict_detected", "payload": &conflict_payload });
                        state.send_to_workspace(&ws_id, &msg.to_string());
                        state.emit_to_frontend("conflict_detected", &conflict_payload);
                    }

                    let workspaces = WorkspaceManager::list_workspaces();
                    state.emit_to_frontend("workspaces_updated", &workspaces);
                }
            }
            None
        }

        "identify" => {
            if let Some(payload) = message.get("payload") {
                if let Some(browser) = payload.get("browser").and_then(|v| v.as_str()) {
                    let browser_instance_id = payload.get("browserInstanceId").and_then(|v| v.as_str()).unwrap_or("").to_string();
                    if browser_instance_id.is_empty() {
                        return Some(json!({
                            "type": "error",
                            "payload": { "message": "Missing browserInstanceId" }
                        }).to_string());
                    }

                    // Mettre à jour le browser du client
                    state.update_client_info(client_id, browser, &browser_instance_id);
                    info!("Client {} identified as {}", client_id, browser);

                    let existing_assignment = WorkspaceManager::get_workspace_for_browser(&browser_instance_id);
                    if let Some(ws_id) = existing_assignment {
                        state.update_client_workspace(client_id, Some(ws_id.clone()));
                        if let Ok(workspace) = WorkspaceManager::load_workspace(&ws_id) {
                            return Some(json!({
                                "type": "workspace_switched",
                                "payload": {
                                    "workspaceId": workspace.id,
                                    "workspaceName": workspace.name,
                                    "bookmarks": workspace.bookmarks,
                                    "folders": workspace.folders,
                                    "version": workspace.version,
                                    "created": false
                                }
                            }).to_string());
                        }
                    }

                    let current_ws_id = payload.get("currentWorkspaceId")
                        .and_then(|v| v.as_str())
                        .filter(|s| !s.is_empty());
                    if current_ws_id.is_none() {
                        info!("First connection from {}, requesting bookmarks for workspace creation", browser);
                        return Some(json!({
                            "type": "sync_request",
                            "payload": {
                                "reason": "first_connection"
                            }
                        }).to_string());
                    }
                }
            }
            None
        }

        "switch_workspace" => {
            if let Some(payload) = message.get("payload") {
                if let Some(workspace_id) = payload.get("workspaceId").and_then(|v| v.as_str()) {
                    let browser_instance_id = {
                        let clients = state.connected_clients.read();
                        clients.get(client_id)
                            .and_then(|c| c.browser_instance_id.clone())
                    };
                    let Some(browser_instance_id) = browser_instance_id else {
                        return Some(json!({
                            "type": "error",
                            "payload": { "message": "Client not identified" }
                        }).to_string());
                    };

                    // Charger le workspace demandé
                    match WorkspaceManager::load_workspace(workspace_id) {
                        Ok(workspace) => {
                            // Obtenir le nom du navigateur
                            let browser_name = {
                                let clients = state.connected_clients.read();
                                clients.get(client_id)
                                    .map(|c| c.browser.clone())
                                    .unwrap_or_else(|| "Unknown".to_string())
                            };

                            // Assigner le workspace au navigateur
                            if let Err(e) = WorkspaceManager::assign_workspace(&browser_instance_id, &browser_name, workspace_id) {
                                warn!("Failed to assign workspace: {}", e);
                                return Some(json!({
                                    "type": "error",
                                    "payload": { "message": e }
                                }).to_string());
                            }

                            // Mettre à jour le state du client
                            state.update_client_workspace(client_id, Some(workspace_id.to_string()));

                            info!("Client {} switched to workspace '{}'", client_id, workspace.name);

                            // Envoyer le workspace au client
                            return Some(json!({
                                "type": "workspace_switched",
                                "payload": {
                                    "workspaceId": workspace.id,
                                    "workspaceName": workspace.name,
                                    "bookmarks": workspace.bookmarks,
                                    "folders": workspace.folders,
                                    "version": workspace.version
                                }
                            }).to_string());
                        }
                        Err(e) => {
                            warn!("Workspace not found: {}", e);
                            return Some(json!({
                                "type": "error",
                                "payload": { "message": format!("Workspace non trouvé: {}", e) }
                            }).to_string());
                        }
                    }
                }
            }
            None
        }

        "get_workspaces" => {
            let workspaces = WorkspaceManager::list_workspaces();
            let current_ws_id = state.get_client_workspace(client_id);

            // Ajouter un flag "assigned" pour indiquer le workspace actuel du client
            let workspaces_with_status: Vec<_> = workspaces.iter().map(|ws| {
                json!({
                    "id": ws.id,
                    "name": ws.name,
                    "color": ws.color,
                    "icon": ws.icon,
                    "totalBookmarks": ws.total_bookmarks,
                    "totalFolders": ws.total_folders,
                    "assigned": current_ws_id.as_ref() == Some(&ws.id)
                })
            }).collect();

            Some(json!({
                "type": "workspaces_list",
                "payload": {
                    "workspaces": workspaces_with_status
                }
            }).to_string())
        }

        // ==================== Gestion des dossiers ====================

        "folder_created" => {
            if let Some(payload) = message.get("payload") {
                state.mark_internal_save();
                let workspace_id = payload.get("workspaceId").and_then(|v| v.as_str()).map(|s| s.to_string())
                    .or_else(|| state.get_client_workspace(client_id));
                let Some(ws_id) = workspace_id else { return None; };

                let source = {
                    let clients = state.connected_clients.read();
                    clients.get(client_id)
                        .and_then(|c| c.browser_instance_id.clone())
                        .unwrap_or_else(|| client_id.to_string())
                };

                let _lock_arc = state.get_workspace_lock(&ws_id);
                let _lock = _lock_arc.lock();
                if let Ok((workspace, conflict)) = WorkspaceManager::apply_workspace_item_change(&ws_id, "folder_created", payload, &source) {
                    state.update_workspace_cache(&workspace);
                    log_sync_entry(state, "folder_created", &source, Some(&ws_id), 1, true, None);
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": {
                            "workspaceId": ws_id,
                            "bookmarks": &workspace.bookmarks,
                            "folders": &workspace.folders,
                            "version": workspace.version,
                            "source": format!("browser-{}", source)
                        }
                    });
                    state.send_to_workspace(&ws_id, &broadcast.to_string());

                    if let Some(c) = conflict {
                        let conflict_payload = json!({
                            "workspaceId": ws_id,
                            "conflictId": c.id,
                            "syncId": c.sync_id,
                            "itemType": c.item_type
                        });
                        let msg = json!({ "type": "conflict_detected", "payload": &conflict_payload });
                        state.send_to_workspace(&ws_id, &msg.to_string());
                        state.emit_to_frontend("conflict_detected", &conflict_payload);
                    }
                    let workspaces = WorkspaceManager::list_workspaces();
                    state.emit_to_frontend("workspaces_updated", &workspaces);
                }
            }
            None
        }

        "folder_removed" => {
            if let Some(payload) = message.get("payload") {
                state.mark_internal_save();
                let workspace_id = payload.get("workspaceId").and_then(|v| v.as_str()).map(|s| s.to_string())
                    .or_else(|| state.get_client_workspace(client_id));
                let Some(ws_id) = workspace_id else { return None; };

                let source = {
                    let clients = state.connected_clients.read();
                    clients.get(client_id)
                        .and_then(|c| c.browser_instance_id.clone())
                        .unwrap_or_else(|| client_id.to_string())
                };

                let _lock_arc = state.get_workspace_lock(&ws_id);
                let _lock = _lock_arc.lock();
                if let Ok((workspace, conflict)) = WorkspaceManager::apply_workspace_item_change(&ws_id, "folder_removed", payload, &source) {
                    state.update_workspace_cache(&workspace);
                    log_sync_entry(state, "folder_removed", &source, Some(&ws_id), 1, true, None);
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": {
                            "workspaceId": ws_id,
                            "bookmarks": &workspace.bookmarks,
                            "folders": &workspace.folders,
                            "version": workspace.version,
                            "source": format!("browser-{}", source)
                        }
                    });
                    state.send_to_workspace(&ws_id, &broadcast.to_string());

                    if let Some(c) = conflict {
                        let conflict_payload = json!({
                            "workspaceId": ws_id,
                            "conflictId": c.id,
                            "syncId": c.sync_id,
                            "itemType": c.item_type
                        });
                        let msg = json!({ "type": "conflict_detected", "payload": &conflict_payload });
                        state.send_to_workspace(&ws_id, &msg.to_string());
                        state.emit_to_frontend("conflict_detected", &conflict_payload);
                    }
                    let workspaces = WorkspaceManager::list_workspaces();
                    state.emit_to_frontend("workspaces_updated", &workspaces);
                }
            }
            None
        }

        "folder_changed" => {
            if let Some(payload) = message.get("payload") {
                state.mark_internal_save();
                let workspace_id = payload.get("workspaceId").and_then(|v| v.as_str()).map(|s| s.to_string())
                    .or_else(|| state.get_client_workspace(client_id));
                let Some(ws_id) = workspace_id else { return None; };

                let source = {
                    let clients = state.connected_clients.read();
                    clients.get(client_id)
                        .and_then(|c| c.browser_instance_id.clone())
                        .unwrap_or_else(|| client_id.to_string())
                };

                let _lock_arc = state.get_workspace_lock(&ws_id);
                let _lock = _lock_arc.lock();
                if let Ok((workspace, conflict)) = WorkspaceManager::apply_workspace_item_change(&ws_id, "folder_changed", payload, &source) {
                    state.update_workspace_cache(&workspace);
                    log_sync_entry(state, "folder_changed", &source, Some(&ws_id), 1, true, None);
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": {
                            "workspaceId": ws_id,
                            "bookmarks": &workspace.bookmarks,
                            "folders": &workspace.folders,
                            "version": workspace.version,
                            "source": format!("browser-{}", source)
                        }
                    });
                    state.send_to_workspace(&ws_id, &broadcast.to_string());

                    if let Some(c) = conflict {
                        let conflict_payload = json!({
                            "workspaceId": ws_id,
                            "conflictId": c.id,
                            "syncId": c.sync_id,
                            "itemType": c.item_type
                        });
                        let msg = json!({ "type": "conflict_detected", "payload": &conflict_payload });
                        state.send_to_workspace(&ws_id, &msg.to_string());
                        state.emit_to_frontend("conflict_detected", &conflict_payload);
                    }
                    let workspaces = WorkspaceManager::list_workspaces();
                    state.emit_to_frontend("workspaces_updated", &workspaces);
                }
            }
            None
        }

        _ => {
            warn!("Unknown message type from {}: {}", client_id, msg_type);
            None
        }
    }
}
