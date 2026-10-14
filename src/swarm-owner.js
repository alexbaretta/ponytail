// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
// Generated from src/swarm-owner.ts by npm run build.
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveSwarmOwner = resolveSwarmOwner;
function resolveSwarmOwner(invokingRoot, swarmOwnershipInventory) {
    const invokingUserWorktrees = swarmOwnershipInventory.userWorktrees.filter(swarmUserWorktree => swarmUserWorktree.rootPath === invokingRoot);
    const invokingManagedWorktrees = swarmOwnershipInventory.managedWorktrees.filter(swarmManagedWorktree => swarmManagedWorktree.rootPath === invokingRoot);
    if (invokingUserWorktrees.length > 1 || invokingManagedWorktrees.length > 1
        || invokingUserWorktrees.length > 0 && invokingManagedWorktrees.length > 0)
        throw new Error('swarm: ambiguous worktree ownership');
    const swarmUserWorktree = invokingUserWorktrees[0];
    if (swarmUserWorktree !== undefined)
        return swarmUserWorktree;
    const swarmManagedWorktree = invokingManagedWorktrees[0];
    if (swarmManagedWorktree === undefined)
        throw new Error('swarm: invoking worktree has no recorded role');
    if (swarmManagedWorktree.ownerRoot === null)
        throw new Error('swarm: managed worktree is unassigned');
    const owningSwarmUserWorktrees = swarmOwnershipInventory.userWorktrees.filter(swarmUserWorktree => swarmUserWorktree.rootPath === swarmManagedWorktree.ownerRoot);
    const owningSwarmUserWorktree = owningSwarmUserWorktrees[0];
    if (owningSwarmUserWorktrees.length !== 1 || owningSwarmUserWorktree === undefined)
        throw new Error('swarm: managed worktree has no unique user-worktree owner');
    if (owningSwarmUserWorktree.gitCommonDirectory !== swarmManagedWorktree.gitCommonDirectory)
        throw new Error('swarm: managed worktree and owner belong to different repositories');
    return owningSwarmUserWorktree;
}
