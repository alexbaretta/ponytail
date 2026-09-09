// Copyright (c) 2026 Alex Baretta <alex@baretta.com>.
// Licensed under the MIT License. See LICENSE in the project root.

import {
    isLosslessNumber,
    parse as parseLosslessJson,
    stringify as stringifyLosslessJson,
} from 'lossless-json';

function assertLosslessJsonValue(value: unknown): void {
    if (
        value === null
        || typeof value === 'boolean'
        || typeof value === 'string'
        || isLosslessNumber(value)
    ) {
        return;
    }

    if (typeof value === 'number') {
        if (Number.isSafeInteger(value)) {
            return;
        }

        throw new Error('Native JSON numbers must be safe integers.');
    }

    if (Array.isArray(value)) {
        value.forEach(assertLosslessJsonValue);
        return;
    }

    if (typeof value === 'object') {
        const prototype: object | null = Object.getPrototypeOf(value);

        if (prototype !== Object.prototype && prototype !== null) {
            throw new Error('Only plain objects can be serialized as JSON.');
        }

        Object.values(value).forEach(assertLosslessJsonValue);
        return;
    }

    throw new Error('The supplied value cannot be serialized as JSON.');
}

export function parseJsonLosslessly(jsonText: string): unknown {
    return parseLosslessJson(jsonText);
}

export function stringifyJsonLosslessly(
    value: unknown,
    space?: number | undefined
): string {
    assertLosslessJsonValue(value);

    const serializedValue: string | undefined = stringifyLosslessJson(
        value,
        undefined,
        space
    );

    if (serializedValue === undefined) {
        throw new Error('The supplied value cannot be serialized as JSON.');
    }

    return serializedValue;
}
