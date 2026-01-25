use std::net::SocketAddr;
use std::sync::Arc;
use futures_util::{SinkExt, StreamExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::broadcast;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use chrono::Utc;
use log::{error, info, warn};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::state::{SharedState, ConnectedClient};
use crate::bookmarks::BookmarksManager;

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
        match listener.accept().await {
            Ok((stream, addr)) => {
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
    let ws_stream = match accept_async(stream).await {
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

                    let (merged, success, bookmarks_data) = {
                        let mut local_bookmarks = state.bookmarks.write();
                        let merged = BookmarksManager::merge_bookmarks(
                            &mut local_bookmarks,
                            bookmarks.clone(),
                        );
                        let success = BookmarksManager::save_bookmarks(&mut local_bookmarks);
                        let data = local_bookmarks.clone();
                        (merged, success, data)
                    };

                    state.update_sync_complete(
                        success,
                        if success { None } else { Some("Failed to save".to_string()) },
                    );

                    // Broadcast to other clients (extensions)
                    let broadcast = json!({
                        "type": "bookmarks_updated",
                        "payload": { "bookmarks": &merged }
                    });
                    state.broadcast_message(&broadcast.to_string());

                    // Émettre vers le frontend React
                    state.emit_to_frontend("bookmarks_updated", &bookmarks_data);

                    info!("Sync completed from {}: {} bookmarks", client_id, merged.len());

                    return Some(json!({
                        "type": "sync_complete",
                        "payload": {
                            "success": success,
                            "bookmarks": merged
                        }
                    }).to_string());
                }
            }
            None
        }

        "bookmark_created" => {
            if let Some(payload) = message.get("payload") {
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

        _ => {
            warn!("Unknown message type from {}: {}", client_id, msg_type);
            None
        }
    }
}
