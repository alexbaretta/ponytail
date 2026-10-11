// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
import fs from 'node:fs';

export type TaskletStatus = 'PENDING' | 'DONE' | 'ERROR';
export function parseTaskletStatuses(sprintFile: string, text = fs.readFileSync(sprintFile, 'utf8'), allowEmpty = false): Map<string, TaskletStatus> {
  const statuses = new Map<string, TaskletStatus>();
  const heading = /^### \[( |DONE|ERROR)\] Tasklet (S\d+-F\d+-T\d+): .+$/;
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('###') || !line.includes('Tasklet')) continue;
    const match = line.match(heading);
    if (!match) throw new Error(`${sprintFile} contains a malformed tasklet heading: ${line}`);
    const id = match[2];
    if (id === undefined) throw new Error('tasklet matcher lacks its required ID capture');
    if (statuses.has(id)) throw new Error(`duplicate tasklet heading: ${id}`);
    const status = match[1];
    if (status !== ' ' && status !== 'DONE' && status !== 'ERROR') throw new Error(`invalid tasklet status: ${id}`);
    statuses.set(id, status === ' ' ? 'PENDING' : status);
  }
  if (statuses.size === 0 && !allowEmpty) throw new Error(`${sprintFile} contains no tasklet headings`);
  return statuses;
}
