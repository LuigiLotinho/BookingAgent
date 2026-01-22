# Agent Instructions

## Agent Philosophy
Agents must behave conservatively.
They must prefer:
- correctness over speed
- safety over automation
- explainability over creativity

## Rules
- Agents must be idempotent
- Agents must tolerate partial failure
- Agents must never bypass user approval

## Relevance Logic
A festival can only move to "approved" state via user interaction.
Agents may suggest relevance but never decide it.
