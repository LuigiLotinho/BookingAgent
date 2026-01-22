# Architecture Instructions

## System Separation
The system must be split into:
- Frontend (UI & UX only)
- Backend (logic, agents, scraping)
- Background workers (scheduled tasks)

Frontend must never:
- scrape websites
- send emails
- run AI classification
- contain credentials

Backend must:
- expose a clean API
- own all business logic
- be stateless per request where possible

## Extensibility
Although V1 supports only one band, architecture must allow:
- multiple bands in the future
- per-band configuration
- per-band agents

Do not hardcode band-specific data.
