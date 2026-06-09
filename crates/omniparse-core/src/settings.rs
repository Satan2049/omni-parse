use crate::config::{read_settings, update_settings, AppSettings};

pub fn get_public_settings() -> AppSettings {
    read_settings()
}

pub fn apply_settings(patch: AppSettings) -> AppSettings {
    update_settings(patch)
}
