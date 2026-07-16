# Next Steps

With one more day, I would first add a human approval queue for all
manual-review cases and improve address verification for street-only
locations, intersections, and postal-code-only requests.

I would then add retry handling and monitoring for Gmail, Gemini,
Google Sheets, and processed-message state failures. I would also
expand the evaluation set with ambiguous, adversarial, multilingual,
and same-thread follow-up messages.

Before allowing unattended live sending, I would run another staged
batch with staff approval enabled and define alerts for failed,
low-confidence, or unexpectedly high-volume decisions.
