// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveSwarmOwner,type SwarmOwnershipInventory,type SwarmUserWorktree} from '../src/swarm-owner.js';

const firstSwarmUserWorktree:SwarmUserWorktree={rootPath:'/project/user-001',gitCommonDirectory:'/project/main/.git'};
const secondSwarmUserWorktree:SwarmUserWorktree={rootPath:'/project/user-002',gitCommonDirectory:'/project/main/.git'};
const swarmOwnershipInventory:SwarmOwnershipInventory={userWorktrees:[firstSwarmUserWorktree,secondSwarmUserWorktree],
 managedWorktrees:[{rootPath:'/project/managed/101',ownerRoot:firstSwarmUserWorktree.rootPath,gitCommonDirectory:'/project/main/.git'}]};

// Traceability: verifies REQ-SWARM-OWNERSHIP
test('owner and managed checkout select the same swarm while sibling user worktrees stay independent',()=>{
 assert.deepEqual(resolveSwarmOwner(firstSwarmUserWorktree.rootPath,swarmOwnershipInventory),firstSwarmUserWorktree);
 assert.deepEqual(resolveSwarmOwner('/project/managed/101',swarmOwnershipInventory),firstSwarmUserWorktree);
 assert.deepEqual(resolveSwarmOwner(secondSwarmUserWorktree.rootPath,swarmOwnershipInventory),secondSwarmUserWorktree);
});

// Traceability: verifies REQ-SWARM-OWNERSHIP
test('unassigned, unknown and contradictory worktree roles never manufacture swarm ownership',()=>{
 const unassignedSwarmOwnershipInventory:SwarmOwnershipInventory={...swarmOwnershipInventory,
  managedWorktrees:[{rootPath:'/project/managed/101',ownerRoot:null,gitCommonDirectory:'/project/main/.git'}]};
 assert.throws(()=>resolveSwarmOwner('/project/managed/101',unassignedSwarmOwnershipInventory),/unassigned/);
 assert.throws(()=>resolveSwarmOwner('/unrecorded',swarmOwnershipInventory),/no recorded role/);
 const contradictorySwarmOwnershipInventory:SwarmOwnershipInventory={...swarmOwnershipInventory,
  managedWorktrees:[{rootPath:firstSwarmUserWorktree.rootPath,ownerRoot:secondSwarmUserWorktree.rootPath,gitCommonDirectory:'/project/main/.git'}]};
 assert.throws(()=>resolveSwarmOwner(firstSwarmUserWorktree.rootPath,contradictorySwarmOwnershipInventory),/ambiguous/);
});

// Traceability: verifies REQ-SWARM-OWNERSHIP
test('duplicate, dangling and cross-repository owner bindings fail explicitly',()=>{
 const duplicateSwarmOwnershipInventory:SwarmOwnershipInventory={...swarmOwnershipInventory,
  managedWorktrees:[...swarmOwnershipInventory.managedWorktrees,...swarmOwnershipInventory.managedWorktrees]};
 assert.throws(()=>resolveSwarmOwner('/project/managed/101',duplicateSwarmOwnershipInventory),/ambiguous/);
 const danglingSwarmOwnershipInventory:SwarmOwnershipInventory={...swarmOwnershipInventory,userWorktrees:[]};
 assert.throws(()=>resolveSwarmOwner('/project/managed/101',danglingSwarmOwnershipInventory),/no unique/);
 const foreignSwarmOwnershipInventory:SwarmOwnershipInventory={...swarmOwnershipInventory,
  managedWorktrees:[{rootPath:'/project/managed/101',ownerRoot:firstSwarmUserWorktree.rootPath,gitCommonDirectory:'/foreign/.git'}]};
 assert.throws(()=>resolveSwarmOwner('/project/managed/101',foreignSwarmOwnershipInventory),/different repositories/);
});
