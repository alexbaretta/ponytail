// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import path from 'node:path';
import ts from 'typescript';
import type { TstsDiagnostic, TstsDiagnosticSeverity } from './index.js';

export interface TstsMessageDeclaration {
    readonly path: string;
    readonly exportName: string;
}

export interface TstsMessageContract extends TstsMessageDeclaration {
    readonly id: string;
}

export interface TstsMessageApiBase {
    readonly id: string;
    readonly receiver: TstsMessageDeclaration;
    readonly method: string;
    readonly contractId: string;
    readonly channelParameter: number;
    readonly raw?: boolean;
}

export interface TstsMessageProducerApi extends TstsMessageApiBase {
    readonly role: 'producer';
    readonly payloadParameter: number;
}

export interface TstsMessageConsumerApi extends TstsMessageApiBase {
    readonly role: 'consumer';
    readonly callbackParameter: number;
    readonly callbackPayloadParameter: number;
}

// Discriminator: role
export type TstsMessageApi = TstsMessageProducerApi | TstsMessageConsumerApi;

export interface TstsMessageAdapter extends TstsMessageDeclaration {
    readonly apiId: string;
}

export interface TstsSharedMessageContractsConfig {
    readonly contracts: readonly TstsMessageContract[];
    readonly apis: readonly TstsMessageApi[];
    readonly adapters?: readonly TstsMessageAdapter[];
    readonly severity?: TstsDiagnosticSeverity;
}

export interface TstsMessageWorkspace {
    readonly rootPath: string;
    readonly program: ts.Program;
    readonly checker: ts.TypeChecker;
    readonly sourceFiles: readonly ts.SourceFile[];
}

interface BoundMessageType {
    readonly typeNode: ts.TypeNode;
    readonly bindings: ReadonlyMap<ts.Symbol, ts.Type>;
}

function messageDeclarationId(node: ts.Node): string {
    return `${path.resolve(node.getSourceFile().fileName)}:${node.pos}`;
}

function resolveMessageDeclaration(
    workspace: TstsMessageWorkspace, location: TstsMessageDeclaration, configDirectory: string
): ts.Symbol | undefined {
    const sourceFile: ts.SourceFile | undefined = workspace.program.getSourceFile(
        path.resolve(configDirectory, location.path));
    if (sourceFile === undefined) return undefined;
    const symbol: ts.Symbol | undefined = workspace.checker.getSymbolAtLocation(sourceFile);
    if (symbol === undefined) return undefined;
    const exportedSymbol: ts.Symbol | undefined = workspace.checker.getExportsOfModule(symbol)
        .find(candidate => candidate.name === location.exportName);
    return exportedSymbol !== undefined && (exportedSymbol.flags & ts.SymbolFlags.Alias) !== 0
        ? workspace.checker.getAliasedSymbol(exportedSymbol) : exportedSymbol;
}

function finiteMessageChannels(type: ts.Type, checker: ts.TypeChecker): readonly string[] | undefined {
    if ((type.flags & ts.TypeFlags.TypeParameter) !== 0) {
        const constraint: ts.Type | undefined = checker.getBaseConstraintOfType(type);
        return constraint === undefined ? undefined : finiteMessageChannels(constraint, checker);
    }
    if (type.isStringLiteral()) return [type.value];
    if (type.isUnion()) {
        const channels: string[] = [];
        for (const member of type.types) {
            const values: readonly string[] | undefined = finiteMessageChannels(member, checker);
            if (values === undefined) return undefined;
            channels.push(...values);
        }
        return channels.length === 0 ? undefined : [...new Set(channels)];
    }
    return undefined;
}

function expandMessageType(
    boundMessageType: BoundMessageType, checker: ts.TypeChecker, seen: ReadonlySet<ts.Node> = new Set()
): BoundMessageType {
    const { typeNode, bindings } = boundMessageType;
    if (seen.has(typeNode)) return boundMessageType;
    if (ts.isParenthesizedTypeNode(typeNode)) {
        return expandMessageType({ typeNode: typeNode.type, bindings }, checker,
            new Set([...seen, typeNode]));
    }
    if (!ts.isTypeReferenceNode(typeNode)) return boundMessageType;
    let symbol: ts.Symbol | undefined = checker.getSymbolAtLocation(typeNode.typeName);
    if (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = checker.getAliasedSymbol(symbol);
    const typeAliasDeclaration: ts.TypeAliasDeclaration | undefined = symbol?.declarations?.find(ts.isTypeAliasDeclaration);
    if (typeAliasDeclaration === undefined) return boundMessageType;
    const aliasBindings: Map<ts.Symbol, ts.Type> = new Map(bindings);
    for (const [index, parameter] of (typeAliasDeclaration.typeParameters ?? []).entries()) {
        const argument: ts.TypeNode | undefined = typeNode.typeArguments?.[index];
        const parameterSymbol: ts.Symbol | undefined = checker.getSymbolAtLocation(parameter.name);
        if (argument !== undefined && parameterSymbol !== undefined) {
            aliasBindings.set(parameterSymbol, boundMessageTypeOfNode(argument, bindings, checker));
        }
    }
    return expandMessageType({ typeNode: typeAliasDeclaration.type, bindings: aliasBindings }, checker,
        new Set([...seen, typeNode]));
}

function boundMessageTypeOfNode(
    typeNode: ts.TypeNode, bindings: ReadonlyMap<ts.Symbol, ts.Type>, checker: ts.TypeChecker
): ts.Type {
    const symbol: ts.Symbol | undefined = ts.isTypeReferenceNode(typeNode)
        ? checker.getSymbolAtLocation(typeNode.typeName) : undefined;
    return (symbol === undefined ? undefined : bindings.get(symbol)) ?? checker.getTypeFromTypeNode(typeNode);
}

function isCanonicalMessageTuple(
    typeNode: ts.TypeNode | undefined, channelType: ts.Type, contractSymbol: ts.Symbol,
    checker: ts.TypeChecker, bindings: ReadonlyMap<ts.Symbol, ts.Type> = new Map()
): boolean {
    if (typeNode === undefined) return false;
    const boundMessageType: BoundMessageType = expandMessageType({ typeNode, bindings }, checker);
    if (!ts.isIndexedAccessTypeNode(boundMessageType.typeNode)) return false;
    const objectType: ts.TypeNode = boundMessageType.typeNode.objectType;
    if (!ts.isTypeReferenceNode(objectType)) return false;
    let symbol: ts.Symbol | undefined = checker.getSymbolAtLocation(objectType.typeName);
    if (symbol !== undefined && (symbol.flags & ts.SymbolFlags.Alias) !== 0) symbol = checker.getAliasedSymbol(symbol);
    return symbol === contractSymbol &&
        boundMessageTypeOfNode(boundMessageType.typeNode.indexType, boundMessageType.bindings, checker) === channelType;
}

function checkMessageSignature(
    signature: ts.Signature, api: TstsMessageApi, contractSymbol: ts.Symbol,
    checker: ts.TypeChecker
): boolean {
    const declaration: ts.SignatureDeclaration | undefined = signature.getDeclaration();
    const channelParameter: ts.ParameterDeclaration | undefined = declaration?.parameters[api.channelParameter];
    if (declaration === undefined || channelParameter?.type === undefined) return false;
    const channelType: ts.Type = checker.getTypeFromTypeNode(channelParameter.type);
    const channels: readonly string[] | undefined = finiteMessageChannels(channelType, checker);
    const contractType: ts.Type = checker.getDeclaredTypeOfSymbol(contractSymbol);
    if (channels === undefined || (channels.length > 1 && (channelType.flags & ts.TypeFlags.TypeParameter) === 0) ||
        channels.some(channel => contractType.getProperty(channel) === undefined)) return false;
    switch (api.role) {
    case 'producer': {
        const payloadParameter: ts.ParameterDeclaration | undefined = declaration.parameters[api.payloadParameter];
        return payloadParameter?.dotDotDotToken !== undefined &&
            declaration.parameters.length === api.payloadParameter + 1 &&
            api.payloadParameter > api.channelParameter &&
            isCanonicalMessageTuple(payloadParameter.type, channelType, contractSymbol, checker);
    }
    case 'consumer': {
        const callbackParameter: ts.ParameterDeclaration | undefined = declaration.parameters[api.callbackParameter];
        if (callbackParameter?.type === undefined) return false;
        const boundMessageType: BoundMessageType = expandMessageType(
            { typeNode: callbackParameter.type, bindings: new Map() }, checker);
        if (!ts.isFunctionTypeNode(boundMessageType.typeNode)) return false;
        const payloadParameter: ts.ParameterDeclaration | undefined = boundMessageType.typeNode.parameters[api.callbackPayloadParameter];
        return payloadParameter?.dotDotDotToken !== undefined &&
            boundMessageType.typeNode.parameters.length === api.callbackPayloadParameter + 1 &&
            isCanonicalMessageTuple(payloadParameter.type, channelType, contractSymbol, checker, boundMessageType.bindings);
    }
    }
}

function isMessageTupleType(type: ts.Type, checker: ts.TypeChecker): type is ts.TypeReference {
    return checker.isTupleType(type);
}

// Traceability: implements REQ-TSTS-SHARED-MESSAGE-CONTRACTS
export function checkSharedMessageContracts(
    workspaces: readonly TstsMessageWorkspace[], config: TstsSharedMessageContractsConfig,
    configDirectory: string
): readonly TstsDiagnostic[] {
    const diagnostics: TstsDiagnostic[] = [];
    const reported: Set<string> = new Set();
    const report = (node: ts.Node | undefined, message: string): void => {
        const key: string = `${node === undefined ? '' : messageDeclarationId(node)}:${message}`;
        if (reported.has(key)) return;
        reported.add(key);
        const sourceFile: ts.SourceFile | undefined = node?.getSourceFile();
        const location: ts.LineAndCharacter | undefined = node === undefined
            ? undefined : sourceFile?.getLineAndCharacterOfPosition(node.getStart());
        diagnostics.push({ ruleId: 'shared-message-contracts', severity: config.severity ?? 'error', message,
            ...(sourceFile === undefined ? {} : { filePath: sourceFile.fileName }),
            ...(location === undefined ? {} : { line: location.line + 1, column: location.character + 1 }),
        });
    };
    const ownedRoots: Set<string> = new Set(workspaces.flatMap(workspace => workspace.program.getRootFileNames()));
    const seenApis: Set<string> = new Set();
    const seenContracts: Set<string> = new Set();
    const seenAdapters: Set<TstsMessageAdapter> = new Set();
    const channelOwners: Map<string, string> = new Map();
    for (const workspace of workspaces) {
        const { checker } = workspace;
        const contracts: Map<string, ts.Symbol> = new Map();
        for (const contract of config.contracts) {
            const symbol: ts.Symbol | undefined = resolveMessageDeclaration(workspace, contract, configDirectory);
            if (symbol === undefined) continue;
            seenContracts.add(contract.id);
            const declaration: ts.Declaration | undefined = symbol.declarations?.[0];
            const type: ts.Type = checker.getDeclaredTypeOfSymbol(symbol);
            const properties: readonly ts.Symbol[] = type.getProperties();
            if (declaration === undefined || properties.length === 0 || checker.getIndexInfosOfType(type).length !== 0 ||
                ((ts.isInterfaceDeclaration(declaration) || ts.isTypeAliasDeclaration(declaration) || ts.isClassDeclaration(declaration)) &&
                    (declaration.typeParameters?.length ?? 0) > 0) ||
                properties.some(property => {
                    const propertyType: ts.Type = checker.getTypeOfSymbolAtLocation(property, declaration);
                    return (property.flags & ts.SymbolFlags.Optional) !== 0 || !isMessageTupleType(propertyType, checker) ||
                        checker.getTypeArguments(propertyType).some(argument =>
                            (argument.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0);
                })) {
                report(declaration, `Contract ${contract.id} must declare a finite required channel set with typed argument tuples and no index signature.`);
                continue;
            }
            contracts.set(contract.id, symbol);
            for (const property of properties) {
                const owner: string | undefined = channelOwners.get(property.name);
                if (owner !== undefined && owner !== contract.id) report(declaration,
                    `Channel ${property.name} belongs to both ${owner} and ${contract.id}; use one canonical declaration.`);
                channelOwners.set(property.name, contract.id);
            }
        }
        const apiSignatures: Map<string, TstsMessageApi> = new Map();
        const adapters: Map<TstsMessageAdapter, ts.Declaration> = new Map();
        for (const api of config.apis) {
            const receiverSymbol: ts.Symbol | undefined = resolveMessageDeclaration(workspace, api.receiver, configDirectory);
            const contractSymbol: ts.Symbol | undefined = contracts.get(api.contractId);
            if (receiverSymbol === undefined || contractSymbol === undefined) continue;
            const receiverDeclaration: ts.Declaration | undefined = receiverSymbol.declarations?.[0];
            if (receiverDeclaration === undefined) continue;
            const receiverType: ts.Type = checker.getDeclaredTypeOfSymbol(receiverSymbol);
            const method: ts.Symbol | undefined = receiverType.getProperty(api.method);
            if (method === undefined) { report(receiverDeclaration, `API ${api.id} has no method ${api.method}.`); continue; }
            seenApis.add(api.id);
            const signatures: readonly ts.Signature[] = checker.getTypeOfSymbolAtLocation(method, receiverDeclaration).getCallSignatures();
            if (signatures.length === 0) report(receiverDeclaration, `API ${api.id}.${api.method} is not callable.`);
            for (const signature of signatures) {
                const declaration: ts.SignatureDeclaration | undefined = signature.getDeclaration();
                if (declaration === undefined) continue;
                const identity: string = messageDeclarationId(declaration);
                if (apiSignatures.has(identity) && apiSignatures.get(identity)?.id !== api.id) {
                    report(declaration, `API ${api.id} duplicates transport registration; configure one canonical API.`);
                }
                apiSignatures.set(identity, api);
                if (api.raw === true) {
                    const sourceFile: ts.SourceFile = declaration.getSourceFile();
                    const owned: boolean = workspaces.some(candidate => {
                        const relative: string = path.relative(candidate.rootPath, sourceFile.fileName);
                        return !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative) &&
                            !relative.split(path.sep).includes('node_modules');
                    });
                    if (!sourceFile.isDeclarationFile || owned || ownedRoots.has(sourceFile.fileName)) {
                        report(declaration, `Raw API ${api.id} must originate in a dependency declaration, not owned source.`);
                    }
                } else if (!checkMessageSignature(signature, api, contractSymbol, checker)) {
                    report(declaration, `API ${api.id}.${api.method} permits uncoupled channels or payloads. Derive every overload's channel and arguments from canonical contract ${api.contractId}.`);
                }
            }
            for (const adapter of config.adapters ?? []) {
                if (adapter.apiId !== api.id || api.raw === true) continue;
                const adapterSymbol: ts.Symbol | undefined = resolveMessageDeclaration(workspace, adapter, configDirectory);
                const adapterDeclaration: ts.Declaration | undefined = adapterSymbol?.valueDeclaration;
                if (adapterSymbol === undefined || adapterDeclaration === undefined) continue;
                seenAdapters.add(adapter);
                const adapterSignatures: readonly ts.Signature[] = checker.getTypeOfSymbolAtLocation(adapterSymbol, adapterDeclaration).getCallSignatures();
                if (adapterSignatures.length === 0 || adapterSignatures.some(signature => signature.getReturnType().getSymbol() !== receiverType.getSymbol())) {
                    report(adapterDeclaration, `Adapter ${adapter.exportName} must expose canonical typed receiver ${api.receiver.exportName}.`);
                } else adapters.set(adapter, adapterDeclaration);
            }
        }
        const visit = (node: ts.Node): void => {
            if (ts.isCallExpression(node)) {
                if (ts.isPropertyAccessExpression(node.expression) &&
                    ['call', 'apply', 'bind'].includes(node.expression.name.text)) {
                    for (const signature of checker.getTypeAtLocation(node.expression.expression).getCallSignatures()) {
                        const declaration: ts.SignatureDeclaration | undefined = signature.getDeclaration();
                        const api: TstsMessageApi | undefined = declaration === undefined ? undefined
                            : apiSignatures.get(messageDeclarationId(declaration));
                        if (api !== undefined) report(node,
                            `API ${api.id}: indirect ${node.expression.name.text} invocation is unsupported; call the canonical typed API directly.`);
                    }
                }
                const callSignatures: readonly ts.Signature[] = checker.getTypeAtLocation(node.expression).getCallSignatures();
                const apis: Map<string, TstsMessageApi> = new Map();
                for (const signature of callSignatures) {
                    const declaration: ts.SignatureDeclaration | undefined = signature.getDeclaration();
                    const api: TstsMessageApi | undefined = declaration === undefined ? undefined : apiSignatures.get(messageDeclarationId(declaration));
                    if (api !== undefined) apis.set(api.id, api);
                }
                for (const api of apis.values()) {
                    const contractSymbol: ts.Symbol | undefined = contracts.get(api.contractId);
                    if (contractSymbol === undefined) continue;
                    const channel: ts.Expression | undefined = node.arguments[api.channelParameter];
                    const channels: readonly string[] | undefined = channel === undefined ? undefined
                        : finiteMessageChannels(checker.getTypeAtLocation(channel), checker);
                    if (channels === undefined) report(node, `API ${api.id}: channel must be a finite declared string-literal set; unrestricted dynamic strings are forbidden.`);
                    else for (const value of channels) if (checker.getDeclaredTypeOfSymbol(contractSymbol).getProperty(value) === undefined) {
                        report(node, `API ${api.id}: unregistered channel ${value}; declare it in canonical contract ${api.contractId}.`);
                    }
                    if (api.raw === true) {
                        const contained: boolean = [...adapters].some(([adapter, declaration]) => {
                            const typedApi: TstsMessageApi | undefined = config.apis.find(candidate => candidate.id === adapter.apiId);
                            return typedApi?.contractId === api.contractId && declaration.getSourceFile() === node.getSourceFile() &&
                                node.pos >= declaration.pos && node.end <= declaration.end;
                        });
                        if (!contained) report(node, `Raw API ${api.id} is permitted only inside a designated adapter exposing canonical contract ${api.contractId}.`);
                    } else {
                        switch (api.role) {
                        case 'producer': break;
                        case 'consumer': {
                            const callback: ts.Expression | undefined = node.arguments[api.callbackParameter];
                            if (callback !== undefined && channel !== undefined) for (const signature of checker.getTypeAtLocation(callback).getCallSignatures()) {
                                const declaration: ts.SignatureDeclaration | undefined = signature.getDeclaration();
                                if (declaration === undefined) continue;
                                const payloadParameters: readonly ts.ParameterDeclaration[] = declaration.parameters.slice(api.callbackPayloadParameter);
                                if (payloadParameters.some(parameter => parameter.type !== undefined) &&
                                    (payloadParameters.length !== 1 || payloadParameters[0]?.dotDotDotToken === undefined ||
                                        !isCanonicalMessageTuple(payloadParameters[0]?.type, checker.getTypeAtLocation(channel), contractSymbol, checker))) {
                                    report(callback, `API ${api.id}: callback arguments must derive from canonical contract ${api.contractId}; use contextual inference or the canonical argument tuple.`);
                                }
                            }
                            break;
                        }
                        }
                    }
                }
            }
            ts.forEachChild(node, visit);
        };
        for (const sourceFile of workspace.sourceFiles) if (!sourceFile.isDeclarationFile) visit(sourceFile);
    }
    for (const contract of config.contracts) if (!seenContracts.has(contract.id)) report(undefined,
        `Cannot resolve canonical contract ${contract.id}: ${contract.path}#${contract.exportName}.`);
    for (const api of config.apis) if (!seenApis.has(api.id)) report(undefined,
        `Cannot resolve transport API ${api.id}; verify its receiver and canonical contract declarations.`);
    for (const adapter of config.adapters ?? []) if (!seenAdapters.has(adapter)) report(undefined,
        `Cannot resolve typed adapter ${adapter.path}#${adapter.exportName} and its non-raw API ${adapter.apiId}.`);
    return diagnostics;
}
