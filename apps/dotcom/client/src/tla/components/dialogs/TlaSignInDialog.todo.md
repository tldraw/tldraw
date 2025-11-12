# TlaSignInDialog TODO

- [x] Surface Clerk errors on the terms acceptance step so users see failures.
- [x] Disable the “Accept and continue” action while the legal acceptance request is pending.
- [x] Show analytics toggle unless the user was already opted in when the dialog mounted (allowing toggling during the session).
- [x] Prevent duplicate email submissions by guarding the form’s submit handler and button state.
- [x] Add resend cooldown/error handling so the verification step treats resend like other actions.
- [x] Only show the terms step when Clerk reports `legal_accepted` as missing to avoid spurious sign-up updates.
