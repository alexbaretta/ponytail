// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    parseJsonLosslessly,
    stringifyJsonLosslessly,
} from '../src/lossless-json.js';

describe('TSTS lossless JSON codec', () => {
    it('round-trips exact numbers', () => {
        const jsonText =
            '{"unsafe":9007199254740993,'
            + '"decimal":1.0000000000000000000001}';

        assert.equal(
            stringifyJsonLosslessly(parseJsonLosslessly(jsonText)),
            jsonText
        );
    });

    it('rejects malformed and unsupported values', () => {
        assert.throws(() => parseJsonLosslessly('{'));
        assert.throws(() => stringifyJsonLosslessly(1n));
    });
});
