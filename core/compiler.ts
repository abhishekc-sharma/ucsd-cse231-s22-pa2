import wabt from 'wabt';
import {Program, Def, VarDef, FunDef, Stmt, Expr, Literal, Type, UnOp, BinOp} from './ast';
import {parseProgram} from './parser';
import {tcProgram} from './tc';

type Env = Map<string, boolean>;

function varDefs(defs: Def<Type>[]): VarDef<Type>[] {
  const vars: VarDef<Type>[] = [];
  defs.forEach((d) => {
    if (d.tag === "variable") {vars.push(d.def);}
  });
  return vars;
}

function funDefs(defs: Def<Type>[]): FunDef<Type>[] {
  const funs: FunDef<Type>[] = [];
  defs.forEach((d) => {
    if (d.tag === "function") {funs.push(d.def);}
  });
  return funs;
}

function varsFunsStmts(program: Program<Type>): [VarDef<Type>[], FunDef<Type>[], Stmt<Type>[]] {
  return [varDefs(program.defs), funDefs(program.defs), program.stmts];
}

export async function run(watSource: string, config: any): Promise<number> {
  const wabtApi = await wabt();

  const parsed = wabtApi.parseWat("example", watSource);
  const binary = parsed.toBinary({});
  const wasmModule = await WebAssembly.instantiate(binary.buffer, config);
  return (wasmModule.instance.exports as any)._start();
}

export function unOpStmts(op: UnOp) {
  switch (op) {
    case "-": return [`(i32.const -1)`, `i32.mul`];
    case "not": return [`(i32.const 1)`, `i32.xor`];
    //default:
    //  throw new Error(`Unhandled or unknown op: ${op}`);
  }
}

export function binOpStmts(op: BinOp) {
  switch (op) {
    case "+": return [`i32.add`];
    case "-": return [`i32.sub`];
    case "*": return [`i32.mul`];
    case "//": return [`i32.div_s`];
    case "%": return [`i32.rem_s`];
    case "==": return [`i32.eq`];
    case "!=": return [`i32.ne`];
    case "<=": return [`i32.le_s`];
    case ">=": return [`i32.ge_s`];
    case "<": return [`i32.lt_s`];
    case ">": return [`i32.gt_s`];
    case "and": return [`i32.and`];
    case "or": return [`i32.or`];
    case "is": return [`i32.eq`];
    //default:
    //  throw new Error(`Unhandled or unknown op: ${op}`);
  }
}

export function codeGenLiteral(literal: Literal<Type>, _locals: Env): Array<string> {
  switch (literal.tag) {
    case "none": return [`(i32.const 0)`];
    case "number": return [`(i32.const ${literal.value})`];
    case "true": return [`(i32.const 1)`];
    case "false": return [`(i32.const 0)`];
  }
}

export function codeGenExpr(expr: Expr<Type>, locals: Env): Array<string> {
  switch (expr.tag) {
    case "literal":
      return codeGenLiteral(expr.value, locals);
    case "id":
      // Since we type-checked for making sure all variable exist, here we
      // just check if it's a local variable and assume it is global if not
      if (locals.has(expr.name)) {return [`(local.get $${expr.name})`];}
      else {return [`(global.get $${expr.name})`];}
    case "unop": {
      const exprs = codeGenExpr(expr.expr, locals);
      const opstmts = unOpStmts(expr.op);
      return [...exprs, ...opstmts];
    }
    case "binop": {
      const lhsExprs = codeGenExpr(expr.lhs, locals);
      const rhsExprs = codeGenExpr(expr.rhs, locals);
      const opstmts = binOpStmts(expr.op);
      return [...lhsExprs, ...rhsExprs, ...opstmts];
    }
    case "call":
      const valStmts = expr.args.map(e => codeGenExpr(e, locals)).flat();
      let toCall = expr.name;
      if (expr.name === "print") {
        switch (expr.args[0].a) {
          case "bool": toCall = "print_bool"; break;
          case "int": toCall = "print_num"; break;
          case "none": toCall = "print_none"; break;
        }
      }
      valStmts.push(`(call $${toCall})`);
      return valStmts;
  }
}

export function codeGenVarDef(def: VarDef<Type>, locals: Env): Array<string> {
  var litStmts = codeGenLiteral(def.value, locals);
  if (locals.has(def.name)) {litStmts.push(`(local.set $${def.name})`);}
  else {litStmts.push(`(global.set $${def.name})`);}
  return litStmts;
}

export function codeGenFunDef(def: FunDef<Type>, locals: Env): Array<string> {
  const withParamsAndVariables = new Map<string, boolean>(locals.entries());

  // Construct the environment for the function body
  const vars = varDefs(def.defs);
  vars.forEach(v => withParamsAndVariables.set(v.name, true));
  def.params.forEach(p => withParamsAndVariables.set(p.name, true));

  // Construct the code for params and variable declarations in the body
  const params = def.params.map(p => `(param $${p.name} i32)`).join(" ");
  const varDecls = vars.map(v => `(local $${v.name} i32)`).join("\n");

  const varInits = vars.map(v => codeGenVarDef(v, withParamsAndVariables)).flat().join("\n");
  const stmts = def.body.map(s => codeGenStmt(s, withParamsAndVariables)).flat();
  const stmtsBody = stmts.join("\n");
  return [`(func $${def.name} ${params} (result i32)
        (local $scratch i32)
        ${varDecls}
        ${varInits}
        ${stmtsBody}
        (i32.const 0))`];
}

export function codeGenStmt(stmt: Stmt<Type>, locals: Env): Array<string> {
  switch (stmt.tag) {
    case "pass":
      return [];
    case "assign":
      var valStmts = codeGenExpr(stmt.value, locals);
      if (locals.has(stmt.name)) {valStmts.push(`(local.set $${stmt.name})`);}
      else {valStmts.push(`(global.set $${stmt.name})`);}
      return valStmts;
    case "expr":
      const result = codeGenExpr(stmt.expr, locals);
      result.push("(local.set $scratch)");
      return result;
    case "return":
      var valStmts = codeGenExpr(stmt.value, locals);
      valStmts.push("return");
      return valStmts;
    case "while":
      var condStmts = codeGenExpr(stmt.cond, locals).join("\n");
      var bodyStmts = stmt.body.map(s => codeGenStmt(s, locals)).flat().join("\n");
      return [
        `(block $loop_block
        (loop $loop_loop
          ${condStmts}
          (i32.const 0)
          (i32.eq)
          (if
            (then
              br $loop_block
            )
          )
          ${bodyStmts}
          br $loop_loop
        ))`];
    case "ifelse":
      var ifcondStmts = codeGenExpr(stmt.ifcond, locals);
      var ifbodyStmts = stmt.ifbody.map(s => codeGenStmt(s, locals)).flat().join("\n");

      // reduce all if condition to either just having an if branch or an if-else branch structure
      if (stmt.elifcond && stmt.elsebody) {
        let newElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.elifcond, ifbody: stmt.elifbody, elsebody: stmt.elsebody};
        let newIfElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.ifcond, ifbody: stmt.ifbody, elsebody: [newElse]};
        return codeGenStmt(newIfElse, locals);
      } else if (stmt.elifcond) {
        let newElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.elifcond, ifbody: stmt.elifbody};
        let newIfElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.ifcond, ifbody: stmt.ifbody, elsebody: [newElse]};
        return codeGenStmt(newIfElse, locals);
      } else if (stmt.elsebody) {
        var elsebodyStmts = stmt.elsebody.map(s => codeGenStmt(s, locals)).flat().join("\n");
        return [
          ...ifcondStmts,
          `(if
            (then
              ${ifbodyStmts}
            )
            (else
              ${elsebodyStmts} 
            )
           )`
        ];
      } else {
        return [
          ...ifcondStmts,
          `(if
            (then
              ${ifbodyStmts}
            )
           )`
        ];
      }
  }
}

export function compile(source: string): string {
  let program = parseProgram(source);
  program = tcProgram(program);
  const emptyEnv = new Map<string, boolean>();
  const [vars, funs, stmts] = varsFunsStmts(program);

  const funsCode: string[] = funs.map(f => codeGenFunDef(f, emptyEnv)).map(f => f.join("\n"));
  const allFuns = funsCode.join("\n\n");

  const varDecls = vars.map(v => `(global $${v.name} (mut i32) (i32.const 0))`).join("\n");
  const varInits = vars.map(v => codeGenVarDef(v, emptyEnv)).map(v => v.join("\n"))

  const allStmts = stmts.map(s => codeGenStmt(s, emptyEnv)).flat();

  const main = [`(local $scratch i32)`, ...varInits, ...allStmts].join("\n");

  var retType = "";
  var retVal = "";
  if (program.stmts.length > 0 && program.stmts[program.stmts.length - 1].tag === "expr") {
    retType = "(result i32)";
    retVal = "(local.get $scratch)"
  }

  return `
    (module
      (func $print_num (import "imports" "print_num") (param i32) (result i32))
      (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
      (func $print_none (import "imports" "print_none") (param i32) (result i32))
      ${varDecls}
      ${allFuns}
      (func (export "_start") ${retType}
        ${main}
        ${retVal}
      )
    ) 
  `;
}
