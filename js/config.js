// Central config — edit prompts and links here, not in other modules.

export const CONFIG = {

  app: {
    name:       'JP Hub',
    shortName:  'JP Hub',
    themeColor: '#0A0A0C',
  },

  // Fill in your OneDrive and Outlook share URLs here.
  links: {
    oneDrive: '',
    outlook:  '',
  },

  providers: {
    claude: {
      label:    'Claude',
      deepLink: 'claude://',
      webUrl:   'https://claude.ai',
    },
    chatgpt: {
      label:    'ChatGPT',
      deepLink: 'chatgpt://',
      webUrl:   'https://chat.openai.com',
    },
    copilot: {
      label:    'Copilot',
      deepLink: 'ms-edge://',
      webUrl:   'https://copilot.microsoft.com',
    },
  },

  // Prompts per action per provider.
  // Each value is a function that receives the formatted email context string.
  prompts: {

    reply: {
      claude:  ctx => `/email assistant\n\nDraft a reply to this email. Be warm, direct, and professional. Sign off with "Kind regards," only.\n\n${ctx}`,
      chatgpt: ctx => `Use email assistant skill.\n\nDraft a reply to this email:\n\n${ctx}`,
      copilot: ctx => `Draft a professional email reply to the following email. Be concise and direct. Sign off with Kind regards,\n\n${ctx}`,
    },

    summarise: {
      claude:  ctx => `/email assistant\n\nSummarise in 3 bullets: what they want, key questions raised, and the required action.\n\n${ctx}`,
      chatgpt: ctx => `Use email assistant skill.\n\nSummarise in 3 bullets: what they want, key questions, required action:\n\n${ctx}`,
      copilot: ctx => `Summarise this email in 3 bullet points: what the sender wants, any key questions they have raised, and what action is required.\n\n${ctx}`,
    },

    workorder: {
      claude:  ctx => `/email assistant\n\nGenerate a tech services work order or fault report based on this email. Include equipment, issue, urgency, and site.\n\n${ctx}`,
      chatgpt: ctx => `Use email assistant skill.\n\nGenerate a tech services work order or fault report based on this email:\n\n${ctx}`,
      copilot: ctx => `Based on this email, generate a tech services work order. Include the equipment involved, the reported fault or request, urgency level, and site location.\n\n${ctx}`,
    },

    techservices: {
      claude:  ctx => `/email assistant\n\nDraft a tech services handover or loan unit request based on this email.\n\n${ctx}`,
      chatgpt: ctx => `Use email assistant skill.\n\nDraft a tech services handover or loan unit request based on this email:\n\n${ctx}`,
      copilot: ctx => `Draft a tech services handover note or loan unit request based on the following email.\n\n${ctx}`,
    },

    task: {
      claude:  ctx => `/email assistant\n\nExtract all action items as a numbered list with priority (High / Medium / Low) and owner where identifiable.\n\n${ctx}`,
      chatgpt: ctx => `Use email assistant skill.\n\nExtract all action items as a numbered list with priority (High / Medium / Low):\n\n${ctx}`,
      copilot: ctx => `Extract all action items from this email as a numbered list. Label each with a priority of High, Medium, or Low.\n\n${ctx}`,
    },

    escalate: {
      claude:  ctx => `/email assistant\n\nDraft an escalation to my manager Chris Waxman (Executive Territory Manager, Stryker South Pacific). Include the issue, why it needs escalation, and what I need from him.\n\n${ctx}`,
      chatgpt: ctx => `Use email assistant skill.\n\nDraft an escalation to my manager Chris Waxman (Executive Territory Manager, Stryker South Pacific). Include the issue, why it needs escalation, and what I need from him:\n\n${ctx}`,
      copilot: ctx => `Draft an escalation email to my manager Chris Waxman, Executive Territory Manager at Stryker South Pacific. Explain the issue from the email below, why it needs to be escalated, and what I need him to do.\n\n${ctx}`,
    },

  },

};
