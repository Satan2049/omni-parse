import ipaddress
import socket
from urllib.parse import urlparse

from app.core.exceptions import InvalidURLError

_BLOCKED_HOSTNAMES = frozenset(
    {
        "localhost",
        "metadata.google.internal",
        "metadata.aws.internal",
    }
)


def assert_url_is_safe(url: str) -> None:
    """Reject URLs that target private or internal networks (SSRF mitigation)."""
    parsed = urlparse(url)
    hostname = parsed.hostname

    if not hostname:
        raise InvalidURLError("URL is missing a hostname")

    lowered = hostname.lower().rstrip(".")
    if lowered in _BLOCKED_HOSTNAMES or lowered.endswith(".localhost"):
        raise InvalidURLError("URLs pointing to internal hosts are not allowed")

    if lowered == "127.0.0.1" or lowered.startswith("127."):
        raise InvalidURLError("URLs pointing to loopback addresses are not allowed")

    try:
        without_brackets = lowered.removeprefix("[").removesuffix("]")
        ip = ipaddress.ip_address(without_brackets)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            raise InvalidURLError("URLs pointing to private or internal networks are not allowed")
        return
    except ValueError:
        pass

    try:
        for info in socket.getaddrinfo(hostname, parsed.port or 443, type=socket.SOCK_STREAM):
            resolved_ip = ipaddress.ip_address(info[4][0])
            if (
                resolved_ip.is_private
                or resolved_ip.is_loopback
                or resolved_ip.is_link_local
                or resolved_ip.is_reserved
                or resolved_ip.is_multicast
            ):
                raise InvalidURLError("URLs pointing to private or internal networks are not allowed")
    except socket.gaierror:
        return
