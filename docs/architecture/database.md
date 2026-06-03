# Database

OmniParse is stateless — no database layer is used.

All extraction and conversion operations are ephemeral:

- Input is processed in-memory
- Output is returned directly in the API response or as a streamed file download
- No persistence, caching, or user sessions

If future versions add job queues, history, or user accounts, a database layer should be introduced with centralized repository access per project conventions.
