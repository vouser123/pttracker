# Responsibility-First File Placement

Use this doc before editing any existing file.

This rule is about file ownership, not file length.

## The Required Test

Before editing an existing file, answer these two questions:

1. What single responsibility does this file own right now?
2. Does the exact change I am about to make belong inside that responsibility?

If either answer is unclear, mixed, or only works because the file is described with a very broad umbrella label, stop and choose a better home for the change.

That may mean:

- split the file first
- create a new file for the new concern
- move shared code into a clearly named shared owner

## What Not To Optimize For

Do not optimize for:

- staying under a file cap
- using the remaining space in a file
- making the structure hook pass
- avoiding a new file

Those are coarse signals. They are not the target.

## What This Rule Means In Practice

- A short file can still be the wrong home for a change.
- A file under the cap can still be structurally wrong.
- Passing the structure hook does not mean the edit is placed correctly.
- A new concern introduced by an edit is evidence that a new file may be needed.
- Code used in multiple places should live in a maintainable shared owner instead of being copied or parked in a broad file.

## Agent Mantra

Do not ask, "Can this fit here?"

Ask, "Is this file the right owner for this behavior?"

## Why This Exists

This repo is maintained heavily by AI agents. Mixed concerns are harder for agents to find, harder to change safely, and easier to break indirectly.

The goal is simple:

- a future agent should be able to find the right file quickly
- make one change to one concern
- avoid collateral changes to unrelated behavior

Use this test before every edit, not after a hook or review step flags a problem.
