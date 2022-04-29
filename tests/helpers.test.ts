import {importObject} from "./import-object.test";
import {tcProgram} from '../core/tc'
import {parseProgram} from '../core/parser'
import {compile, run as runProgram} from '../core/compiler';

// Modify typeCheck to return a `Type` as we have specified below
export function typeCheck(source: string): Type {
  let program = parseProgram(source);
  program = tcProgram(program);

  if (program.stmts.length === 0) {
    return "none";
  }

  let lastStmt = program.stmts[program.stmts.length - 1];
  if (lastStmt.tag !== "expr") {
    return "none";
  }

  let t = lastStmt.expr.a;
  if (t === "int" || t === "bool" || t === "none") {
    return t;
  } else {
    return CLASS(t.name);
  }
}

// Modify run to use `importObject` (imported above) to use for printing
// You can modify `importObject` to have any new fields you need here, or
// within another function in your compiler, for example if you need other
// JavaScript-side helpers
export async function run(source: string) {
  //@ts-ignore
  importObject.imports.runtime_error = () => {
    throw new Error(`RUNTIME ERROR:`);
  }

  //@ts-ignore
  importObject.memory = {};
  //@ts-ignore
  importObject.memory.heap = new WebAssembly.Memory({initial: 100, maximum: 100});
  await runProgram(compile(source), importObject);
}

type Type =
  | "int"
  | "bool"
  | "none"
  | {tag: "object", class: string}

export const NUM: Type = "int";
export const BOOL: Type = "bool";
export const NONE: Type = "none";
export function CLASS(name: string): Type {
  return {tag: "object", class: name}
};
