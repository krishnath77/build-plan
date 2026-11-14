import { onCall } from 'firebase-functions/v2/https';
import { defineSecret, defineString, defineInt } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Anthropic from '@anthropic-ai/sdk';
import { makeAskClaude } from './src/askClaude.js';
import { makeGetAccess, makeUsage } from './src/data.js';

initializeApp();

// Build Plan (Class 10) function. Own codebase "c10"; Anuj's askClaude is in the default codebase and is never touched from here.
// The Anthropic key is the existing secret ANTHROPIC_API_KEY (declared here, never read or set by this repo).
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const C10_MODEL = defineString('C10_MODEL', { default: 'claude-sonnet-5-5' });
const C10_DAILY_CAP = defineInt('C10_DAILY_CAP', { default: 80 });

export const askClaude10 = onCall(
  { region: 'asia-south1', secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 300, memory: '512MiB', maxInstances: 10 },
  request => {
    const db = getFirestore();
    const handler = makeAskClaude({
      getAccess: makeGetAccess(db),
      usage: makeUsage(db, FieldValue),
      anthropic: new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() }),
      getModel: () => C10_MODEL.value(),
      getCap: () => C10_DAILY_CAP.value()
    });
    return handler(request);
  }
);
