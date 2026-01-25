use std::io::{self, Read, Write};
use byteorder::{ReadBytesExt, WriteBytesExt, NativeEndian};
use serde_json::Value;
use log::{error, debug, info};

/// Reads a message from stdin in Native Messaging format
/// (4 bytes length + JSON string)
pub fn read_message() -> Option<Value> {
    let mut stdin = io::stdin();
    
    // Read 4 bytes length
    let len = match stdin.read_u32::<NativeEndian>() {
        Ok(len) => len as usize,
        Err(ref e) if e.kind() == io::ErrorKind::UnexpectedEof => {
            debug!("Input stream closed");
            return None;
        }
        Err(e) => {
            error!("Error reading message length: {}", e);
            return None;
        }
    };

    if len > 1024 * 1024 {
        error!("Message too large: {} bytes", len);
        return None;
    }

    // Read content
    let mut buffer = vec![0u8; len];
    if let Err(e) = stdin.read_exact(&mut buffer) {
        error!("Error reading message body: {}", e);
        return None;
    }

    // Parse JSON
    match serde_json::from_slice(&buffer) {
        Ok(v) => Some(v),
        Err(e) => {
            error!("Error parsing JSON: {}", e);
            None
        }
    }
}

/// Sends a message to stdout in Native Messaging format
pub fn send_message(msg: &Value) -> bool {
    let json_str = match serde_json::to_string(msg) {
        Ok(s) => s,
        Err(e) => {
            error!("Error serializing message: {}", e);
            return false;
        }
    };

    let bytes = json_str.as_bytes();
    let len = bytes.len() as u32;

    if len > 1024 * 1024 {
        error!("Message too large to send: {} bytes", len);
        return false;
    }

    let mut stdout = io::stdout();
    
    // Write length
    if let Err(e) = stdout.write_u32::<NativeEndian>(len) {
        error!("Error writing message length: {}", e);
        return false;
    }

    // Write content
    if let Err(e) = stdout.write_all(bytes) {
        error!("Error writing message body: {}", e);
        return false;
    }

    if let Err(e) = stdout.flush() {
        error!("Error flushing stdout: {}", e);
        return false;
    }

    info!("Message sent: type={}", msg.get("type").and_then(|t| t.as_str()).unwrap_or("unknown"));
    true
}
