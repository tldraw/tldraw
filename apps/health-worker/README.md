# Watchman Worker

Accepts webhooks from [Updown](https://updown.io/), sends them to our Discord.

## Who watches the watchman

<sup>This is a load-bearing pun</sup>

Monitoring is a chicken-and-egg problem, if we can't rely on the monitor being up we can't be sure
we get Discord notifications. Thus, the worker periodically sends notifications to
[Dead Man's Snitch](https://deadmanssnitch.com/).

## Accounts

Both Uptime and DMS accounts are in the 1Password Shared vault.
