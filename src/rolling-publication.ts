// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.

export interface RollingAcceptedIncrement {
 readonly id:string;
 readonly revision:string;
}
export type RollingPublicationTrigger = 'threshold' | 'explicit_flush' | 'completion' | 'quiescence';
export interface RollingPublicationWaiting {
 readonly state:'WAITING';
 readonly reason:'empty' | 'below_threshold';
 readonly count:number;
}
export interface RollingPublicationFrozen {
 readonly state:'FROZEN';
 readonly trigger:RollingPublicationTrigger;
 readonly increments:readonly RollingAcceptedIncrement[];
 readonly campaignRevision:string;
}
// Discriminator: state
export type RollingPublicationSelection = RollingPublicationWaiting | RollingPublicationFrozen;

function requirePublication(condition:unknown,message:string):asserts condition {
 if (!condition) throw new Error(`rolling publication: ${message}`);
}

// Traceability: implements REQ-ROLLING-PUBLICATION
// The store supplies only accepted, unpublished delivery receipts in campaign
// ancestry order. Repeated receipt acknowledgements cannot increase the count.
export function selectRollingPublicationBatch(orderedRollingAcceptedIncrements:readonly RollingAcceptedIncrement[],
 publicationSize:number,flush:Exclude<RollingPublicationTrigger,'threshold'> | null = null):RollingPublicationSelection {
 requirePublication(Number.isSafeInteger(publicationSize) && publicationSize > 0,'publication size must be a positive safe integer');
 requirePublication(flush === null || flush === 'explicit_flush' || flush === 'completion' || flush === 'quiescence','unsupported publication trigger');
 const map = new Map<string,RollingAcceptedIncrement>();
 for (const rollingAcceptedIncrement of orderedRollingAcceptedIncrements) {
  requirePublication(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(rollingAcceptedIncrement.id)
   && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(rollingAcceptedIncrement.revision),'invalid accepted increment identity');
  const previousRollingAcceptedIncrement = map.get(rollingAcceptedIncrement.id);
  requirePublication(!previousRollingAcceptedIncrement || previousRollingAcceptedIncrement.revision === rollingAcceptedIncrement.revision,
   'accepted increment revision is immutable');
  if (!previousRollingAcceptedIncrement) map.set(rollingAcceptedIncrement.id,{id:rollingAcceptedIncrement.id,revision:rollingAcceptedIncrement.revision});
 }
 const uniqueRollingAcceptedIncrements = [...map.values()];
 if (uniqueRollingAcceptedIncrements.length === 0) return {state:'WAITING',reason:'empty',count:0};
 const trigger = uniqueRollingAcceptedIncrements.length >= publicationSize ? 'threshold' : flush;
 if (trigger === null)
  return {state:'WAITING',reason:'below_threshold',count:uniqueRollingAcceptedIncrements.length};
 const selectedRollingAcceptedIncrements = uniqueRollingAcceptedIncrements.slice(0,publicationSize);
 const finalRollingAcceptedIncrement = selectedRollingAcceptedIncrements.at(-1);
 requirePublication(finalRollingAcceptedIncrement,'publication cannot freeze an empty batch');
 return {state:'FROZEN',trigger,
  increments:selectedRollingAcceptedIncrements,campaignRevision:finalRollingAcceptedIncrement.revision};
}
