// Copyright (c) 2026 Alex Baretta. All rights reserved.
// Licensed under the MIT License. See LICENSE in the project root.
export type IndexProgressPhase='files'|'source files'|'plan manifests'|'cached files'|'database records'|'certificate assessments';
export interface IndexProgressDetails {readonly parsedFiles:number;readonly reusedFiles:number;}
export interface IndexProgressStream {readonly isTTY?:boolean;write(text:string):unknown;}

// Traceability: implements REQ-TRACEABILITY-INDEX
// Traceability: implements REQ-TRACEABILITY-PROGRESS
export function indexProgress(indexProgressStream:IndexProgressStream=process.stdout,now:()=>number=Date.now):{
 update(completed:number,total:number,corpus:string,phase?:IndexProgressPhase,details?:IndexProgressDetails):void;stop():void;
} {
 const stageStarts=new Map<string,number>();
 let currentStage='';let startedAt=now();let lastPrintedAt=0;let lineOpen=false;let lineLength=0;
 const stop=():void=>{if(lineOpen) indexProgressStream.write('\n');lineOpen=false;lineLength=0;};
 return {
  update(completed,total,corpus,phase='files',details) {
   const stage=`${corpus}:${phase}`;
   const first=stage!==currentStage;
   if(first) {stop();currentStage=stage;startedAt=completed===0?now():stageStarts.get(stage)??now();stageStarts.set(stage,startedAt);}
   if(!first && completed!==total && now()-lastPrintedAt<1000) return;
   lastPrintedAt=now();
   const percentage=total===0?100:Math.floor(completed*100/total);
   const filled=Math.floor(percentage*40/100);
   const eta=total===0?'0s':completed===0?'unknown':`${Math.ceil((now()-startedAt)/1000*(total-completed)/completed)}s`;
   const counts=details===undefined?'':` | ${details.parsedFiles} parsed, ${details.reusedFiles} reused`;
   const text=`${corpus.padEnd(12)} [${'='.repeat(filled)}${' '.repeat(40-filled)}] ${String(percentage).padStart(3)}% ${String(completed).padStart(6)}/${String(total).padStart(6)} ${phase.padEnd(23)} | elapsed ${String(Math.floor((now()-startedAt)/1000)).padStart(4)}s | ETA ${eta.padStart(7)}${counts}`;
   const line=indexProgressStream.isTTY?text.padEnd(lineLength):text;
   indexProgressStream.write(indexProgressStream.isTTY?`\r${line}`:`${line}\n`);
   lineLength=line.length;
   lineOpen=indexProgressStream.isTTY===true;
   if(completed===total) stop();
  },stop,
 };
}
