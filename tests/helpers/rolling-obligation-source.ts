// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parse,stringify} from 'lossless-json';
import {parseObligationDocument,type ObligationDocumentV1} from '../../skills/plan-execution/scripts/obligations.js';

// Frozen physical V1 fixture from 77a1fcb; no dependency on a mutable active plan.
export function readRollingObligationFixtureSource(kind:'definitions' | 'history' = 'definitions'):ObligationDocumentV1 {
 const value:unknown = parse(fs.readFileSync(path.join(__dirname,'../../../tests/fixtures/rolling-obligation-document.v1.json'),'utf8'));
 assert.ok(value !== null && typeof value === 'object' && !Array.isArray(value) && 'definitions' in value && 'history' in value);
 assert.deepEqual(Object.keys(value),['definitions','history']);
 const source = stringify(kind === 'definitions' ? value.definitions : value.history);
 assert.ok(typeof source === 'string');
 return parseObligationDocument(source);
}
