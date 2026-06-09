use std::net::{IpAddr, ToSocketAddrs};

use url::Url;

use crate::config::read_settings;
use crate::error::{AppError, AppResult};

const BLOCKED_HOSTNAMES: &[&str] = &[
    "localhost",
    "metadata.google.internal",
    "metadata.aws.internal",
];

fn is_blocked_ip(ip: IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_private()
                || v4.is_loopback()
                || v4.is_link_local()
                || v4.is_broadcast()
                || v4.is_multicast()
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || v6.is_multicast()
                || v6.is_unique_local()
                || v6.is_unicast_link_local()
        }
    }
}

fn blocked_ip_message(hostname: &str, ip: &str, literal: bool) -> String {
    if literal {
        format!(
            "The address {ip} is a private or internal network address. \
             OmniParse blocks these by default (not about page logins). \
             Enable Allow Private Network URLs in Arrangements to allow LAN URLs."
        )
    } else {
        format!(
            "The hostname '{hostname}' resolved to {ip}, which is a private or internal address. \
             OmniParse blocks these by default. Enable Allow Private Network URLs in Arrangements for LAN URLs."
        )
    }
}

pub fn assert_url_is_safe(url: &str) -> AppResult<()> {
    if read_settings().allow_private_network_urls {
        return Ok(());
    }

    let parsed = Url::parse(url).map_err(|_| AppError::InvalidUrl("URL is missing a hostname".into()))?;
    let hostname = parsed
        .host_str()
        .ok_or_else(|| AppError::InvalidUrl("URL is missing a hostname".into()))?;

    let lowered = hostname.to_lowercase().trim_end_matches('.').to_string();
    if BLOCKED_HOSTNAMES.contains(&lowered.as_str()) || lowered.ends_with(".localhost") {
        return Err(AppError::InvalidUrl(format!(
            "The hostname '{hostname}' points to this machine or an internal service."
        )));
    }

    if lowered == "127.0.0.1" || lowered.starts_with("127.") {
        return Err(AppError::InvalidUrl(blocked_ip_message(hostname, &lowered, true)));
    }

    let unbracketed = lowered.trim_start_matches('[').trim_end_matches(']');
    if let Ok(ip) = unbracketed.parse::<IpAddr>() {
        if is_blocked_ip(ip) {
            return Err(AppError::InvalidUrl(blocked_ip_message(hostname, &ip.to_string(), true)));
        }
        return Ok(());
    }

    let port = parsed.port_or_known_default().unwrap_or(443);
    let addrs: Vec<_> = (hostname, port)
        .to_socket_addrs()
        .map_err(|_| AppError::InvalidUrl(format!("Could not resolve hostname: {hostname}")))?
        .collect();

    for addr in addrs {
        if is_blocked_ip(addr.ip()) {
            return Err(AppError::InvalidUrl(blocked_ip_message(
                hostname,
                &addr.ip().to_string(),
                false,
            )));
        }
    }

    Ok(())
}

pub fn is_valid_url(url: &str) -> bool {
    Url::parse(url)
        .map(|u| matches!(u.scheme(), "http" | "https") && u.host().is_some())
        .unwrap_or(false)
}
