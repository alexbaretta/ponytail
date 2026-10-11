// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/project-index-database.ts by npm run build.
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectIndexError = void 0;
exports.databaseOptions = databaseOptions;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
class ProjectIndexError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
exports.ProjectIndexError = ProjectIndexError;
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function optionalString(value, field) {
    if (value === undefined || typeof value === 'string')
        return value;
    throw new ProjectIndexError('PROJECT_INDEX_DATABASE_INVALID', `database.${field} must be a string when supplied`);
}
function databaseOptions(worktreePath) {
    const project = JSON.parse(node_fs_1.default.readFileSync(node_path_1.default.join(worktreePath, 'ponytail-journal.json'), 'utf8'));
    if (!isRecord(project) || !isRecord(project.database)) {
        throw new ProjectIndexError('PROJECT_INDEX_DATABASE_INVALID', 'project journal must contain a database object');
    }
    const database = project.database;
    const name = optionalString(database.name, 'name');
    const host = optionalString(database.host, 'host');
    const user = optionalString(database.role, 'role');
    const passwordEnvironment = optionalString(database.passwordEnvironment, 'passwordEnvironment');
    const port = database.port;
    if (!(port === undefined || typeof port === 'number' && Number.isInteger(port) && port > 0 && port <= 65535)) {
        throw new ProjectIndexError('PROJECT_INDEX_DATABASE_INVALID', 'database.port must be an integer between 1 and 65535 when supplied');
    }
    const password = passwordEnvironment === undefined ? undefined : process.env[passwordEnvironment];
    if (passwordEnvironment !== undefined && password === undefined) {
        throw new ProjectIndexError('PROJECT_INDEX_PASSWORD_MISSING', `password environment variable is missing: ${passwordEnvironment}`);
    }
    return { database: name, host, port, user, password };
}
