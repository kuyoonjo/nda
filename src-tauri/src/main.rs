// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;

use tauri::{
    menu::{
        CheckMenuItemBuilder, MenuBuilder, MenuId, MenuItemBuilder, MenuItemKind,
        PredefinedMenuItem, SubmenuBuilder,
    },
    AppHandle, Emitter, Manager,
};

use std::sync::RwLock;
use tauri_plugin_appearance::{get_theme, set_theme, Theme};

#[tauri::command]
fn open_save_dialog(dir: &str, default_file_name: &str) -> Result<String, ()> {
    let fd = native_dialog::FileDialog::new()
        .set_location(dir)
        .set_filename(default_file_name)
        .show_save_single_file();
    if let Ok(Some(fd)) = fd {
        if let Some(p) = fd.to_str() {
            Ok(p.to_string())
        } else {
            Err(())
        }
    } else {
        Err(())
    }
}

lazy_static! {
    static ref ID: RwLock<usize> = RwLock::new(1);
}
fn new_id() -> String {
    let mut id = ID.write().unwrap();
    *id = *id + 1;
    return format!("{:0>2}", *id);
}

fn check_win_menu(app: &AppHandle, id: &MenuId) {
    if let Some(menu) = app.menu() {
        if let Some(MenuItemKind::Submenu(ref win_menu)) = menu.get(tauri::menu::WINDOW_SUBMENU_ID)
        {
            if let Ok(items) = win_menu.items() {
                for item in items {
                    if let MenuItemKind::Check(item) = item {
                        item.set_checked(item.id() == id).unwrap();
                    }
                }
            }
        }
    }
}

fn add_win_menu(app: &AppHandle, label: &String, title: &str) {
    let win =
        tauri::WebviewWindowBuilder::new(app, label, tauri::WebviewUrl::App("index.html".into()))
            .inner_size(800.0, 600.0)
            .title(title)
            .build()
            .unwrap();
    if let Some(menu) = app.menu() {
        if let Some(MenuItemKind::Submenu(ref win_menu)) = menu.get(tauri::menu::WINDOW_SUBMENU_ID)
        {
            let id = format!("window-{}", label);
            let menu = CheckMenuItemBuilder::with_id(&id, label.replace("-", " #"))
                .build(app)
                .unwrap();
            win_menu.append(&menu).unwrap();
            check_win_menu(app, menu.id());

            win.on_window_event(move |e| match e {
                tauri::WindowEvent::Destroyed => {
                    remove_win_menu(menu.app_handle(), menu.id());
                }
                tauri::WindowEvent::Focused(focused) => {
                    if *focused {
                        check_win_menu(menu.app_handle(), menu.id());
                    }
                }
                _ => {}
            });
        }
    }
}

fn remove_win_menu(app: &AppHandle, id: &MenuId) {
    if let Some(menu) = app.menu() {
        if let Some(MenuItemKind::Submenu(ref win_menu)) = menu.get(tauri::menu::WINDOW_SUBMENU_ID)
        {
            if let Ok(items) = win_menu.items() {
                for item in items {
                    if let MenuItemKind::Check(item) = item {
                        if item.id() == id {
                            win_menu.remove(&item).unwrap();
                        }
                    }
                }
            }
        }
    }
}
fn main() {
    let mut ctx = tauri::generate_context!();
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_appearance::init(ctx.config_mut()))
        .plugin(tauri_plugin_udp::init())
        .plugin(tauri_plugin_tcp::init())
        .plugin(tauri_plugin_mqtt::init())
        .plugin(tauri_plugin_serialplugin::init())
        .invoke_handler(tauri::generate_handler![open_save_dialog,])
        .setup(|app| {
            let new_udp_window = MenuItemBuilder::with_id("new_udp_window", "New UDP Window")
                .accelerator("Shift+Alt+U")
                .build(app)?;
            let new_tcp_window = MenuItemBuilder::with_id("new_tcp_window", "New TCP Window")
                .accelerator("Shift+Alt+T")
                .build(app)?;
            let new_websocket_window =
                MenuItemBuilder::with_id("new_websocket_window", "New Websocket Window")
                    .accelerator("Shift+Alt+W")
                    .build(app)?;
            let new_socketio_window =
                MenuItemBuilder::with_id("new_socketio_window", "New SocketIO Window")
                    .accelerator("Shift+Alt+S")
                    .build(app)?;
            let new_mqtt_window = MenuItemBuilder::with_id("new_mqtt_window", "New MQTT Window")
                .accelerator("Shift+Alt+M")
                .build(app)?;
            let new_serialport_window = MenuItemBuilder::with_id("new_serialport_window", "New Serialport Window")
                .accelerator("Shift+Alt+P")
                .build(app)?;

            let theme_menu = SubmenuBuilder::with_id(app, "theme", "Theme").build()?;
            let theme_auto = CheckMenuItemBuilder::with_id("theme_auto", "Auto").build(app)?;
            let theme_light = CheckMenuItemBuilder::with_id("theme_light", "Light").build(app)?;
            let theme_dark = CheckMenuItemBuilder::with_id("theme_dark", "Dark").build(app)?;
            theme_auto.set_checked(false)?;
            theme_light.set_checked(false)?;
            theme_dark.set_checked(false)?;
            theme_menu.append(&theme_auto)?;
            theme_menu.append(&theme_light)?;
            theme_menu.append(&theme_dark)?;

            let theme = get_theme(app.handle());
            match theme {
                Theme::Light => {
                    theme_light.set_checked(true)?;
                }
                Theme::Dark => {
                    theme_dark.set_checked(true)?;
                }
                _ => {
                    theme_auto.set_checked(true)?;
                }
            }

            let separator = PredefinedMenuItem::separator(app)?;

            let menu = MenuBuilder::new(app)
                .items(&[
                    &new_udp_window,
                    &new_tcp_window,
                    &new_websocket_window,
                    &new_socketio_window,
                    &new_mqtt_window,
                    &new_serialport_window,
                    &separator,
                    &theme_menu,
                ])
                .build()?;
            if let Some(tray) = app.tray_by_id("default") {
                tray.set_menu(Some(menu))?;
            }

            #[cfg(target_os = "macos")]
            if let Some(menu) = app.menu() {
                if let Ok(items) = menu.items() {
                    if let Some(MenuItemKind::Submenu(app_menu)) = items.get(0) {
                        app_menu.insert(&theme_menu, 3).unwrap();
                    }

                    if let Some(MenuItemKind::Submenu(file_menu)) = items.get(1) {
                        file_menu.insert(&separator, 0)?;
                        file_menu.insert(&new_serialport_window, 0)?;
                        file_menu.insert(&new_mqtt_window, 0)?;
                        file_menu.insert(&new_socketio_window, 0)?;
                        file_menu.insert(&new_websocket_window, 0)?;
                        file_menu.insert(&new_tcp_window, 0)?;
                        file_menu.insert(&new_udp_window, 0)?;

                        let win_menu = menu.get(tauri::menu::WINDOW_SUBMENU_ID);
                        if let Some(MenuItemKind::Submenu(win_menu)) = win_menu {
                            let position = win_menu.items()?.len() - 1;
                            win_menu.remove_at(position)?;
                            let main_win_menu =
                                CheckMenuItemBuilder::with_id("window-UDP-01", "UDP #01")
                                    .build(app)?;
                            win_menu.append(&main_win_menu)?;
                            if let Some(main_win) = app.get_window("UDP-01") {
                                main_win.on_window_event(move |e| match e {
                                    tauri::WindowEvent::Destroyed => {
                                        remove_win_menu(
                                            main_win_menu.app_handle(),
                                            main_win_menu.id(),
                                        );
                                    }
                                    tauri::WindowEvent::Focused(focused) => {
                                        if *focused {
                                            check_win_menu(
                                                main_win_menu.app_handle(),
                                                main_win_menu.id(),
                                            );
                                        }
                                    }
                                    _ => {}
                                });
                            }
                        }
                    }
                }
            }

            app.on_menu_event(move |app, event| {
                if event.id() == theme_auto.id() {
                    set_theme(app.clone(), Theme::Auto).unwrap();
                    theme_auto.set_checked(true).unwrap();
                    theme_light.set_checked(false).unwrap();
                    theme_dark.set_checked(false).unwrap();
                    app.emit("themeChanged", "auto").unwrap();
                } else if event.id() == theme_light.id() {
                    set_theme(app.clone(), Theme::Light).unwrap();
                    theme_auto.set_checked(false).unwrap();
                    theme_light.set_checked(true).unwrap();
                    theme_dark.set_checked(false).unwrap();
                    app.emit("themeChanged", "light").unwrap();
                } else if event.id() == theme_dark.id() {
                    set_theme(app.clone(), Theme::Dark).unwrap();
                    theme_auto.set_checked(false).unwrap();
                    theme_light.set_checked(false).unwrap();
                    theme_dark.set_checked(true).unwrap();
                    app.emit("themeChanged", "dark").unwrap();
                } else if event.id() == new_udp_window.id() {
                    let label = "UDP-".to_string() + &new_id();
                    add_win_menu(app, &label, "Network Debug Assistant - UDP");
                    let theme = get_theme(app);
                    set_theme(app.clone(), theme).unwrap();
                } else if event.id() == new_tcp_window.id() {
                    let label = "TCP-".to_string() + &new_id();
                    add_win_menu(app, &label, "Network Debug Assistant - TCP");
                    let theme = get_theme(app);
                    set_theme(app.clone(), theme).unwrap();
                } else if event.id() == new_mqtt_window.id() {
                    let label = "MQTT-".to_string() + &new_id();
                    add_win_menu(app, &label, "Network Debug Assistant - MQTT");
                    let theme = get_theme(app);
                    set_theme(app.clone(), theme).unwrap();
                } else if event.id() == new_websocket_window.id() {
                    let label = "Websocket-".to_string() + &new_id();
                    add_win_menu(app, &label, "Network Debug Assistant - Websocket");
                    let theme = get_theme(app);
                    set_theme(app.clone(), theme).unwrap();
                } else if event.id() == new_socketio_window.id() {
                    let label = "SocketIO-".to_string() + &new_id();
                    add_win_menu(app, &label, "Network Debug Assistant - SocketIO");
                    let theme = get_theme(app);
                    set_theme(app.clone(), theme).unwrap();
                } else if event.id() == new_serialport_window.id() {
                    let label = "Serialport-".to_string() + &new_id();
                    add_win_menu(app, &label, "Network Debug Assistant - Serialport");
                    let theme = get_theme(app);
                    set_theme(app.clone(), theme).unwrap();
                } else {
                    let id = event.id();
                    println!("id: {}", &id.0);
                    if id.0.starts_with("window-") {
                        check_win_menu(app, id);
                        let label = id.0.replace("window-", "");
                        if let Some(win) = app.get_window(&label) {
                            win.set_focus().unwrap();
                        }
                    }
                }
            });

            Ok(())
        })
        .run(ctx)
        .expect("error while running tauri application");
}
