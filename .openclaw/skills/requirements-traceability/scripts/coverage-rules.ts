// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import type {TraceabilityValidationRuleConfiguration} from '../../../tsts/src/traceability.js' with {'resolution-mode':'import'};
export const requiredCoverageRules: readonly TraceabilityValidationRuleConfiguration[] = [
 {id:'coverage-implementation',sourceKind:'requirement',targetKind:'implementation',roles:['implements','supports'],direction:'reverse',cardinality:{minimum:1}},
 {id:'coverage-unit-test',sourceKind:'requirement',targetKind:'unit-test',roles:['verifies'],direction:'reverse',cardinality:{minimum:1}},
 {id:'coverage-integration-test',sourceKind:'requirement',targetKind:'integration-test',roles:['verifies'],direction:'reverse',cardinality:{minimum:1}},
 {id:'coverage-uat',sourceKind:'requirement',targetKind:'uat',roles:['verifies'],direction:'reverse',cardinality:{minimum:1}},
];
