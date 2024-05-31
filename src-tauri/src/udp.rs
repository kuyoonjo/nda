use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use std::{collections::HashMap, io};
use tauri::Manager;
use tokio::net::UdpSocket;
use tokio::sync::RwLock;
use tokio::task::JoinHandle;
use tokio::time::{self, sleep};

// fn get_sockets() -> &'static mut HashMap<String, UdpSocket> {
//     static HASHMAP: OnceLock<HashMap<String, UdpSocket>> = OnceLock::new();
//     HASHMAP.get_or_init(|| {
//       let mut m = HashMap::new();
//       m
//     })
// }

struct Udp {
    pub task: JoinHandle<()>,
    pub sock: Arc<UdpSocket>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Payload {
    addr: String,
    data: Vec<u8>,
}

lazy_static! {
    static ref SOCKETS: RwLock<HashMap<String, Udp>> = RwLock::new(HashMap::new());
}

pub async fn bind(window: tauri::Window, id: String, bind_at: String) -> io::Result<()> {
    let mut sockets = SOCKETS.write().await;

    if let Some(s) = sockets.get(&id) {
        s.task.abort();
        sockets.remove(&id);
        sleep(time::Duration::from_millis(100)).await;
    }

    let sock = UdpSocket::bind(&bind_at).await?;
    let _ = sock.set_broadcast(true);
    let arc = Arc::new(sock);
    let sock = arc.clone();
    println!("{} udp bond at {}", &id, &bind_at);
    let task = tokio::task::spawn(async move {
        let mut buf = [0; 65535];
        loop {
            if let Ok((len, addr)) = sock.recv_from(&mut buf).await {
                if len == 1 && buf[0] == 0 {
                    break;
                }
                println!("{:?} bytes received from {:?}", len, addr);
                let _ = window.app_handle().emit_to(
                    window.label(),
                    "udp",
                    Payload {
                        addr: addr.to_string(),
                        data: buf[..len].to_vec(),
                    },
                );
            }
        }
        ()
    });

    sockets.insert(id, Udp { task, sock: arc });
    Ok(())
}

pub async fn unbind(id: String) -> bool {
    let mut sockets = SOCKETS.write().await;

    if let Some(s) = sockets.get(&id) {
        s.task.abort();
        sockets.remove(&id);
        println!("{} udp unbond", &id);
        true
    } else {
        false
    }
}

pub async fn send(id: String, target: String, message: Vec<u8>) -> bool {
    let sockets = SOCKETS.read().await;

    if let Some(s) = sockets.get(&id) {
        println!("{} udp send {} bytes to {}", &id, message.len(), &target);
        match s.sock.send_to(&message, target).await {
            Ok(_) => true,
            Err(_) => false,
        }
    } else {
        false
    }
}

#[tauri::command]
pub async fn udp_bind(window: tauri::Window, id: String, bind_at: String) -> bool {
    match bind(window, id, bind_at).await {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[tauri::command]
pub async fn udp_unbind(id: String) -> bool {
    unbind(id).await
}

#[tauri::command]
pub async fn udp_send(id: String, target: String, message: Vec<u8>) -> bool {
    println!("{} udp send {} bytes to {}", &id, message.len(), &target);
    send(id, target, message).await
}
