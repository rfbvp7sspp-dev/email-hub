# JP Hub Power Automate Contract

JP Hub is a public GitHub Pages app, so it must not contain private webhook URLs,
API keys, OpenAI keys, or agent credentials. The endpoint and shared secret are
stored only in the app Settings screen on the device.

## Endpoint

Use one Power Automate flow with:

- Trigger: `When an HTTP request is received`
- Method: `POST`
- Body: accept plain text or JSON

JP Hub sends this envelope:

```json
{
  "source": "jphub",
  "schemaVersion": 1,
  "sentAt": "2026-05-20T00:00:00.000Z",
  "apiKey": "device-local-shared-secret",
  "command": {
    "type": "agent_action"
  }
}
```

For the one-way buttons, the browser uses `Content-Type: text/plain` and
`mode: no-cors`. In Power Automate, parse the trigger body with `json()` before
reading fields.

Example expression:

```text
json(triggerBody())
```

Then validate:

```text
body('Parse_JSON')?['apiKey']
```

against the secret stored in the flow.

## Command Types

### `agent_action`

Sent by the `Flow` button on an email action card.

```json
{
  "type": "agent_action",
  "action": "reply",
  "requestedAgent": "email-triage",
  "prompt": "full prompt text",
  "email": {
    "sender": "Name",
    "email": "person@example.com",
    "subject": "Subject",
    "body": "Plain text body",
    "attachments": [],
    "hospitalId": "optional-id",
    "emailId": "optional-id"
  }
}
```

Recommended routing:

- `reply`, `summarise`, `task`, `escalate` -> email triage agent
- `workorder`, `techservices` -> tech services agent

Minimum viable flow behavior:

1. Validate `apiKey`.
2. Create a file in `.Claude Agent/workflow-inbox/pending/` or `.Claude Agent/Pending Emails/`.
3. Store the full envelope as JSON.
4. Optionally send a mobile notification that the command was queued.

Local processor:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".Claude Agent\Agents\hospital-context\scripts\process-workflow-inbox.ps1"
```

The processor reads `.Claude Agent\Agents\hospital-context\workflow-inbox\pending`,
routes Hub commands, and records processed files in a ledger so OneDrive move
failures do not process the same command twice.

### `debrief`

Sent when `New Debrief` is saved and an endpoint is configured. If the endpoint
is missing or blocked, JP Hub falls back to downloading the JSON file.

```json
{
  "type": "debrief",
  "requestedAgent": "hospital-context",
  "debrief": {
    "id": "uuid",
    "hospital": "Hospital name",
    "notes": "Raw notes",
    "createdAt": "timestamp"
  },
  "record": {
    "id": "deb_2026-05-20_hospital",
    "type": "debrief",
    "schemaVersion": 1,
    "data": {
      "hospital": "Hospital name",
      "hospitalSlug": "hospital",
      "notes": "Raw notes"
    }
  }
}
```

Minimum viable flow behavior:

1. Validate `apiKey`.
2. Create the `record` JSON file in the hospital context workflow inbox.
3. Notify Jordan that the debrief is queued.

### `sync_inbox`

Sent by the `Sync` button. This requires the flow response to include CORS
headers, otherwise the browser cannot read the returned emails.

Request:

```json
{
  "type": "sync_inbox",
  "limit": 10
}
```

Expected response:

```json
{
  "emails": [
    {
      "sender": "Name",
      "email": "person@example.com",
      "subject": "Subject",
      "body": "Plain text body",
      "time": "timestamp",
      "attachments": [],
      "triageStatus": "new",
      "hospitalId": null,
      "emailId": "optional-id"
    }
  ]
}
```

Response headers needed for browser-readable sync:

```text
Access-Control-Allow-Origin: https://rfbvp7sspp-dev.github.io
Access-Control-Allow-Headers: content-type,x-api-key
Access-Control-Allow-Methods: POST,OPTIONS
```

If CORS is not configured, keep using the file picker for inbound emails and use
the one-way `Flow` buttons for command queuing.

### `create_email`

Sent by the Hub `Create Email` screen. It does not require an imported email.

```json
{
  "type": "create_email",
  "requestedAgent": "email-composer",
  "prompt": "full prompt copied to Claude/ChatGPT/Copilot",
  "draft": {
    "requestId": "hub-compose-...",
    "to": "person@example.com",
    "cc": "",
    "bcc": "",
    "subject": "Rough or final subject",
    "intent": "Short notes about what to say",
    "tone": "warm and direct",
    "bodyText": "Optional ready draft body",
    "bodyHtml": "",
    "attachments": [],
    "approvedByUser": true,
    "draftStatus": "ready_for_outlook_draft"
  }
}
```

If `bodyText` is blank, treat the request as an AI compose job. If `bodyText`
is filled, Power Automate can convert it into an Outlook draft.
