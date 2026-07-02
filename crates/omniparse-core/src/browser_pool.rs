use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};

use chromiumoxide::browser::{Browser, BrowserConfig};
use futures::StreamExt;
use once_cell::sync::Lazy;
use tokio::sync::Mutex;
use tokio::task::JoinHandle;

use crate::error::{AppError, AppResult};

const IDLE_TIMEOUT: Duration = Duration::from_secs(120);

pub(crate) struct BrowserSession {
    browser: Option<Browser>,
    handler: JoinHandle<()>,
}

struct PoolState {
    session: Option<BrowserSession>,
    last_used: Option<Instant>,
}

static POOL: Lazy<Arc<Mutex<PoolState>>> = Lazy::new(|| {
    Arc::new(Mutex::new(PoolState {
        session: None,
        last_used: None,
    }))
});

static BROWSER_LOCK: Lazy<Arc<Mutex<()>>> = Lazy::new(|| Arc::new(Mutex::new(())));

fn find_chromium_executable() -> Option<PathBuf> {
    let candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    ];
    candidates
        .iter()
        .map(PathBuf::from)
        .find(|p| p.exists())
}

async fn launch_browser() -> AppResult<BrowserSession> {
    let executable = find_chromium_executable().ok_or_else(|| {
        AppError::Fetch(
            "No Chromium-based browser found. Install Google Chrome or Microsoft Edge for \
             JavaScript rendering and image resolution."
                .into(),
        )
    })?;

    let profile_dir = std::env::temp_dir().join(format!("omniparse-browser-{}", std::process::id()));

    let config = BrowserConfig::builder()
        .chrome_executable(executable)
        .no_sandbox()
        .new_headless_mode()
        .user_data_dir(&profile_dir)
        .arg("--disable-blink-features=AutomationControlled")
        .arg("--disable-dev-shm-usage")
        .arg("--no-first-run")
        .arg("--no-default-browser-check")
        .arg("--disable-gpu")
        .window_size(1920, 1080)
        .build()
        .map_err(|e| AppError::Fetch(format!("Browser launch config failed: {e}")))?;

    let (browser, mut handler) = Browser::launch(config)
        .await
        .map_err(|e| AppError::Fetch(format!("Failed to launch browser: {e}")))?;

    let handle = tokio::spawn(async move {
        while let Some(event) = handler.next().await {
            if let Err(err) = event {
                log::warn!("Browser handler event error: {err}");
            }
        }
    });

    Ok(BrowserSession {
        browser: Some(browser),
        handler: handle,
    })
}

async fn shutdown_browser(mut session: BrowserSession) {
    if let Some(mut browser) = session.browser.take() {
        let _ = browser.close().await;
        let _ = browser.wait().await;
    }
    session.handler.abort();
}

fn browser_ref(session: &BrowserSession) -> AppResult<&Browser> {
    session
        .browser
        .as_ref()
        .ok_or_else(|| AppError::Fetch("Browser is not available".into()))
}

pub(crate) async fn take_session() -> AppResult<BrowserSession> {
    let mut pool = POOL.lock().await;

    if let Some(last_used) = pool.last_used {
        if last_used.elapsed() > IDLE_TIMEOUT {
            if let Some(session) = pool.session.take() {
                shutdown_browser(session).await;
            }
            pool.last_used = None;
        }
    }

    if let Some(session) = pool.session.take() {
        pool.last_used = None;
        return Ok(session);
    }

    drop(pool);
    launch_browser().await
}

pub(crate) async fn return_session(session: BrowserSession) {
    let mut pool = POOL.lock().await;
    if let Some(old) = pool.session.take() {
        shutdown_browser(old).await;
    }
    pool.session = Some(session);
    pool.last_used = Some(Instant::now());
}

pub(crate) async fn shutdown_session(session: BrowserSession) {
    shutdown_browser(session).await;
}

pub(crate) fn browser_from_session(session: &BrowserSession) -> AppResult<&Browser> {
    browser_ref(session)
}

pub(crate) async fn browser_lock() -> tokio::sync::MutexGuard<'static, ()> {
    BROWSER_LOCK.lock().await
}

pub fn friendly_browser_error(err: impl std::fmt::Display) -> AppError {
    let message = err.to_string();
    if message.contains("oneshot canceled") || message.contains("Canceled") {
        AppError::Fetch(
            "Browser session ended unexpectedly. Ensure Chrome or Edge is installed, close \
             other automation windows, and retry."
                .into(),
        )
    } else {
        AppError::Fetch(message)
    }
}
