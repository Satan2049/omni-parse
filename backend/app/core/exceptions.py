class OmniParseError(Exception):
    """Base application error."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class InvalidURLError(OmniParseError):
    def __init__(self, message: str = "Invalid or unreachable URL") -> None:
        super().__init__(message, status_code=422)


class FetchError(OmniParseError):
    def __init__(self, message: str = "Failed to fetch the requested URL") -> None:
        super().__init__(message, status_code=502)


class FetchTimeoutError(OmniParseError):
    def __init__(self, message: str = "Request timed out while fetching the page") -> None:
        super().__init__(message, status_code=504)


class PayloadTooLargeError(OmniParseError):
    def __init__(self, message: str = "Content exceeds maximum allowed size") -> None:
        super().__init__(message, status_code=413)


class ExtractionError(OmniParseError):
    def __init__(self, message: str = "Failed to extract content from the provided input") -> None:
        super().__init__(message, status_code=422)


class ConversionError(OmniParseError):
    def __init__(self, message: str = "Failed to convert content to the requested format") -> None:
        super().__init__(message, status_code=422)


class ServiceUnavailableError(OmniParseError):
    def __init__(self, message: str = "Required service is unavailable") -> None:
        super().__init__(message, status_code=503)
