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

use crate::state::{SharedState, ConnectedClient};
use crate::bookmarks::BookmarksManager;

/// Nombre maximum de clients WebSocket autorisés simultanément
const MAX_CLIENTS: usize = 10;

/// Types de messages WebSocket autorisés (validation sécurité)
const ALLOWED_MESSAGE_TYPES: &[&str] = &[
    "ping", "get_status", "sync_bookmarks", "bookmark_created", "bookmark_removed",
    "bookmark_changed", "identify", "folder_created", "folder_removed", "folder_changed",
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
    let (tx, _) = broadcast::channel::<String>(100);
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
    mut broadcast_rx: broadcast::Receiver<String>,
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
        browser: "Chrome".to_string(),
        connected_at: Utc::now(),
        last_activity: Utc::now(),
    };
    state.add_client(client);

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // Send welcome message
    let welcome = json!({
        "type": "connected",
        "payload": {
            "client_id": client_id,
            "server_version": "1.0.0"
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
                    if ws_sender.send(Message::Text(msg.into())).await.is_err() {
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
            message.get("payload").is_some()
        }
        "bookmark_removed" | "folder_removed" => {
            message.get("payload")
                .and_then(|p| p.get("id"))
                .and_then(|id| id.as_str())
                .is_some()
        }
        "folder_created" | "folder_changed" => {
            message.get("payload").is_some()
        }
        "identify" => {
            message.get("payload")
                .and_then(|p| p.get("browser"))
                .and_then(|b| b.as_str())
                .is_some()
        }
        // ping et get_status n'ont pas besoin de payload
        _ => true,
    }
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
                if let Some(bookmarks) = payload.get("bookmarks").and_then(|v| v.as_array()) {
                    state.set_sync_in_progress(true);
                    state.mark_internal_save();

                    let (success, merged, folders_merged) = {
                         let mut local_data = state.bookmarks.write();
                         BookmarksManager::process_sync_payload(&mut local_data, bookmarks.clone())
                    };

                    state.update_sync_complete(
                        success,
                        if success { None } else { Some("Failed to save".to_string()) },
                    );
                    
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": { "bookmarks": &merged }
                    });
                    state.broadcast_message(&broadcast.to_string());

                    if !folders_merged.is_empty() {
                         let folders_broadcast = json!({
                             "type": "folders_updated",
                             "payload": { "folders": &folders_merged }
                         });
                         state.broadcast_message(&folders_broadcast.to_string());
                    }

                    let bookmarks_data = state.bookmarks.read().clone();
                    state.emit_to_frontend("bookmarks_updated", &bookmarks_data);

                    info!("Sync completed from {}: {} bookmarks", client_id, merged.len());

                    return Some(json!({
                        "type": "sync_complete",
                        "payload": {
                            "success": success,
                            "bookmarks": merged,
                            "folders": folders_merged
                        }
                    }).to_string());
                }
            }
            None
        }

        "bookmark_created" => {
            if let Some(payload) = message.get("payload") {
                // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
                state.mark_internal_save();
                let result = {
                    let mut bookmarks = state.bookmarks.write();
                    if BookmarksManager::add_bookmark(&mut bookmarks, payload.clone()) {
                        info!("Bookmark created from {}", client_id);
                        Some((bookmarks.bookmarks.clone(), bookmarks.clone()))
                    } else {
                        None
                    }
                };

                if let Some((list, data)) = result {
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": { "bookmarks": list }
                    });
                    state.broadcast_message(&broadcast.to_string());
                    // Émettre vers le frontend React
                    state.emit_to_frontend("bookmarks_updated", &data);
                }
            }
            None
        }

        "bookmark_removed" => {
            if let Some(payload) = message.get("payload") {
                if let Some(id) = payload.get("id").and_then(|v| v.as_str()) {
                    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
                    state.mark_internal_save();
                    let result = {
                        let mut bookmarks = state.bookmarks.write();
                        if BookmarksManager::remove_bookmark(&mut bookmarks, id) {
                            info!("Bookmark removed from {}: {}", client_id, id);
                            Some((bookmarks.bookmarks.clone(), bookmarks.clone()))
                        } else {
                            None
                        }
                    };

                    if let Some((list, data)) = result {
                        let broadcast = json!({
                            "type": "bookmarks_updated",
                            "payload": { "bookmarks": list }
                        });
                        state.broadcast_message(&broadcast.to_string());
                        // Émettre vers le frontend React
                        state.emit_to_frontend("bookmarks_updated", &data);
                    }
                }
            }
            None
        }

        "bookmark_changed" => {
            if let Some(payload) = message.get("payload") {
                if let Some(id) = payload.get("id").and_then(|v| v.as_str()) {
                    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
                    state.mark_internal_save();
                    let result = {
                        let mut bookmarks = state.bookmarks.write();
                        if BookmarksManager::update_bookmark(&mut bookmarks, id, payload.clone()) {
                            info!("Bookmark updated from {}: {}", client_id, id);
                            Some((bookmarks.bookmarks.clone(), bookmarks.clone()))
                        } else {
                            None
                        }
                    };

                    if let Some((list, data)) = result {
                        let broadcast = json!({
                            "type": "bookmarks_updated",
                            "payload": { "bookmarks": list }
                        });
                        state.broadcast_message(&broadcast.to_string());
                        // Émettre vers le frontend React
                        state.emit_to_frontend("bookmarks_updated", &data);
                    }
                }
            }
            None
        }

        "identify" => {
            if let Some(payload) = message.get("payload") {
                if let Some(browser) = payload.get("browser").and_then(|v| v.as_str()) {
                    let mut clients = state.connected_clients.write();
                    if let Some(client) = clients.get_mut(client_id) {
                        client.browser = browser.to_string();
                    }
                    info!("Client {} identified as {}", client_id, browser);
                }
            }
            None
        }

        // ==================== Gestion des dossiers ====================

        "folder_created" => {
            if let Some(payload) = message.get("payload") {
                // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
                state.mark_internal_save();
                let result = {
                    let mut bookmarks = state.bookmarks.write();

                    // If this folder comes from a desktop-initiated creation,
                    // the extension will provide a tempId to map to the real Chrome id.
                    if let (Some(temp_id), Some(real_id)) = (
                        payload.get("tempId").and_then(|v| v.as_str()),
                        payload.get("id").and_then(|v| v.as_str()),
                    ) {
                        if BookmarksManager::remap_folder_id(&mut bookmarks, temp_id, real_id) {
                            info!("Folder created (mapped) from {}: {} -> {}", client_id, temp_id, real_id);
                            Some((bookmarks.folders.clone(), bookmarks.clone()))
                        } else {
                            None
                        }
                    } else if BookmarksManager::add_folder(&mut bookmarks, payload.clone()) {
                        info!("Folder created from {}", client_id);
                        Some((bookmarks.folders.clone(), bookmarks.clone()))
                    } else {
                        None
                    }
                };

                if let Some((folders, data)) = result {
                    let broadcast = json!({
                        "type": "folders_updated",
                        "payload": { "folders": folders }
                    });
                    state.broadcast_message(&broadcast.to_string());
                    state.emit_to_frontend("bookmarks_updated", &data);
                }
            }
            None
        }

        "folder_removed" => {
            if let Some(payload) = message.get("payload") {
                if let Some(id) = payload.get("id").and_then(|v| v.as_str()) {
                    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
                    state.mark_internal_save();
                    let result = {
                        let mut bookmarks = state.bookmarks.write();
                        if BookmarksManager::remove_folder(&mut bookmarks, id) {
                            info!("Folder removed from {}: {}", client_id, id);
                            Some((bookmarks.folders.clone(), bookmarks.clone()))
                        } else {
                            None
                        }
                    };

                    if let Some((folders, data)) = result {
                        let broadcast = json!({
                            "type": "folders_updated",
                            "payload": { "folders": folders }
                        });
                        state.broadcast_message(&broadcast.to_string());
                        state.emit_to_frontend("bookmarks_updated", &data);
                    }
                }
            }
            None
        }

        "folder_changed" => {
            if let Some(payload) = message.get("payload") {
                if let Some(id) = payload.get("id").and_then(|v| v.as_str()) {
                    // Marquer qu'on fait une sauvegarde interne (évite double notification du file_watcher)
                    state.mark_internal_save();
                    let result = {
                        let mut bookmarks = state.bookmarks.write();
                        if BookmarksManager::update_folder(&mut bookmarks, id, payload.clone()) {
                            info!("Folder updated from {}: {}", client_id, id);
                            Some((bookmarks.folders.clone(), bookmarks.clone()))
                        } else {
                            None
                        }
                    };

                    if let Some((folders, data)) = result {
                        let broadcast = json!({
                            "type": "folders_updated",
                            "payload": { "folders": folders }
                        });
                        state.broadcast_message(&broadcast.to_string());
                        state.emit_to_frontend("bookmarks_updated", &data);
                    }
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
