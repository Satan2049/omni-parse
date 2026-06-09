use url::Url;

pub const CHROME_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

pub fn browser_headers(url: Option<&str>) -> reqwest::header::HeaderMap {
    let mut headers = reqwest::header::HeaderMap::new();
    headers.insert(
        reqwest::header::USER_AGENT,
        reqwest::header::HeaderValue::from_static(CHROME_USER_AGENT),
    );
    headers.insert(
        reqwest::header::ACCEPT,
        reqwest::header::HeaderValue::from_static(
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        ),
    );
    headers.insert(
        reqwest::header::ACCEPT_LANGUAGE,
        reqwest::header::HeaderValue::from_static("en-US,en;q=0.9"),
    );
    if let Some(url) = url {
        if let Ok(parsed) = Url::parse(url) {
            let origin = parsed.origin().ascii_serialization();
            if origin != "null" {
                if let Ok(referer) =
                    reqwest::header::HeaderValue::from_str(&format!("{origin}/"))
                {
                    headers.insert(reqwest::header::REFERER, referer);
                }
            }
        }
    }
    headers
}

pub fn http_status_hint(status: u16) -> &'static str {
    match status {
        403 => " The site blocked the request (403). VPN/datacenter IPs are often blocked.",
        401 => " The page requires authentication.",
        429 => " Too many requests (429). Wait and retry.",
        _ => "",
    }
}
