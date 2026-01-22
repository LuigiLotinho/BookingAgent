# Scraping Instructions

## Scope
Scraping is used only to:
- discover festivals
- extract metadata
- find contact methods

## Rules
- Respect robots.txt where applicable
- Use rate limiting
- Retry with backoff
- Never scrape aggressively

## Data Quality
- Mark estimated data clearly
- Never hallucinate missing values
- If contact is unclear, mark as "no contact found"

## Distance
Only festivals within 500 km of Karlsruhe are valid.
