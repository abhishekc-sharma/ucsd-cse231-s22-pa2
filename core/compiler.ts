import wabt from 'wabt';
import {Program, Def, ClassDef, VarDef, FunDef, Stmt, Expr, Literal, Type, UnOp, BinOp} from './ast';
import {parseProgram} from './parser';
import {tcProgram} from './tc';

type ClassEnv = {fieldOffsets: Map<string, number>, alloc: string[]};
type Env = {locals: Map<string, boolean>, classes: Map<string, ClassEnv>};

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

function classDefs(defs: Def<Type>[]): ClassDef<Type>[] {
  const classes: ClassDef<Type>[] = [];
  defs.forEach((d) => {
    if (d.tag === "class") {classes.push(d.def);}
  });
  return classes;
}

function varsFunsClassStmts(program: Program<Type>): [VarDef<Type>[], FunDef<Type>[], ClassDef<Type>[], Stmt<Type>[]] {
  return [varDefs(program.defs), funDefs(program.defs), classDefs(program.defs), program.stmts];
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

export function codeGenExpr(expr: Expr<Type>, env: Env): Array<string> {
  switch (expr.tag) {
    case "literal":
      return codeGenLiteral(expr.value, env);
    case "id":
      // Since we type-checked for making sure all variable exist, here we
      // just check if it's a local variable and assume it is global if not
      if (env.locals.has(expr.name)) {return [`(local.get $${expr.name})`];}
      else {return [`(global.get $${expr.name})`];}
    case "unop": {
      const exprs = codeGenExpr(expr.expr, env);
      const opstmts = unOpStmts(expr.op);
      return [...exprs, ...opstmts];
    }
    case "binop": {
      const lhsExprs = codeGenExpr(expr.lhs, env);
      const rhsExprs = codeGenExpr(expr.rhs, env);
      const opstmts = binOpStmts(expr.op);
      return [...lhsExprs, ...rhsExprs, ...opstmts];
    }
    case "call":
      // check if its a class construction call
      if (env.classes.has(expr.name)) {
        let classEnv = env.classes.get(expr.name);
        return [...classEnv.alloc];
      }
      const valStmts = expr.args.map(e => codeGenExpr(e, env)).flat();
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

export function codeGenVarDef(def: VarDef<Type>, env: Env): Array<string> {
  var litStmts = codeGenLiteral(def.value, env);
  if (env.locals.has(def.name)) {litStmts.push(`(local.set $${def.name})`);}
  else {litStmts.push(`(global.set $${def.name})`);}
  return litStmts;
}

export function codeGenFunDef(def: FunDef<Type>, env: Env): Array<string> {
  const withParamsAndVariables = new Map<string, boolean>(env.locals.entries());

  // Construct the environment for the function body
  const vars = varDefs(def.defs);
  vars.forEach(v => withParamsAndVariables.set(v.name, true));
  def.params.forEach(p => withParamsAndVariables.set(p.name, true));

  // Construct the code for params and variable declarations in the body
  const params = def.params.map(p => `(param $${p.name} i32)`).join(" ");
  const varDecls = vars.map(v => `(local $${v.name} i32)`).join("\n");

  const varInits = vars.map(v => codeGenVarDef(v, {...env, locals: withParamsAndVariables})).flat().join("\n");
  const stmts = def.body.map(s => codeGenStmt(s, {...env, locals: withParamsAndVariables})).flat();
  const stmtsBody = stmts.join("\n");
  return [`(func $${def.name} ${params} (result i32)
        (local $scratch i32)
        ${varDecls}
        ${varInits}
        ${stmtsBody}
        (i32.const 0))`];
}

function buildClassEnv(c: ClassDef<Type>, env: Env) {
  let fieldOffsets = new Map<string, number>();
  fieldOffsets.set("$internal", 0);
  let offset = 4;
  c.fields.forEach(f => {
    fieldOffsets.set(f.name, offset);
    offset += 4;
  });

  let alloc = codeGenObjectAllocation(c, fieldOffsets, env);

  env.classes.set(c.name, {fieldOffsets, alloc});
}

function buildMethodName(className: string, methodName: string): string {
  return `${className}$${methodName}`;
}

function codeGenObjectAllocation(c: ClassDef<Type>, fieldOffsets: Map<string, number>, env: Env): Array<string> {
  let fieldInitialization = c.fields.map(f => {
    let offset = fieldOffsets.get(f.name);
    return [
      `(global.get $heap$ptr)`,
      `(i32.add (i32.const ${offset}))`,
      ...codeGenLiteral(f.value, env),
      `i32.store`
    ];
  }).flat();
  return [
    ...fieldInitialization,
    `(global.get $heap$ptr)`,
    `(call $${buildMethodName(c.name, "__init__")})`,
    `(local.set $scratch)`,
    `(global.get $heap$ptr)`,
    `(global.get $heap$ptr)`,
    `(i32.add (i32.const ${fieldOffsets.size * 4}))`,
    `(global.set $heap$ptr)`,
  ];
}

export function codeGenClassDef(c: ClassDef<Type>, env: Env): string {
  let methods = c.methods.map(m => {
    return codeGenFunDef({...m, name: buildMethodName(c.name, m.name)}, env);
  });

  // generate an empty constructor function if one doesn't exist.
  if (c.methods.findIndex(m => m.name === "__init__") === -1) {
    methods.push(codeGenFunDef({
      name: buildMethodName(c.name, "__init__"),
      params: [{name: "self", typ: {tag: "object", name: c.name}}],
      ret: "none",
      defs: [],
      body: [{tag: "pass"}]
    }, env));
  }

  return methods.map(m => m.join("\n")).join("\n\n");
}

export function codeGenStmt(stmt: Stmt<Type>, env: Env): Array<string> {
  switch (stmt.tag) {
    case "pass":
      return [];
    case "assign":
      var valStmts = codeGenExpr(stmt.value, env);
      if (env.locals.has(stmt.name)) {valStmts.push(`(local.set $${stmt.name})`);}
      else {valStmts.push(`(global.set $${stmt.name})`);}
      return valStmts;
    case "expr":
      const result = codeGenExpr(stmt.expr, env);
      result.push("(local.set $scratch)");
      return result;
    case "return":
      var valStmts = codeGenExpr(stmt.value, env);
      valStmts.push("return");
      return valStmts;
    case "while":
      var condStmts = codeGenExpr(stmt.cond, env).join("\n");
      var bodyStmts = stmt.body.map(s => codeGenStmt(s, env)).flat().join("\n");
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
      var ifcondStmts = codeGenExpr(stmt.ifcond, env);
      var ifbodyStmts = stmt.ifbody.map(s => codeGenStmt(s, env)).flat().join("\n");

      // reduce all if condition to either just having an if branch or an if-else branch structure
      if (stmt.elifcond && stmt.elsebody) {
        let newElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.elifcond, ifbody: stmt.elifbody, elsebody: stmt.elsebody};
        let newIfElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.ifcond, ifbody: stmt.ifbody, elsebody: [newElse]};
        return codeGenStmt(newIfElse, env);
      } else if (stmt.elifcond) {
        let newElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.elifcond, ifbody: stmt.elifbody};
        let newIfElse: Stmt<Type> = {tag: "ifelse", ifcond: stmt.ifcond, ifbody: stmt.ifbody, elsebody: [newElse]};
        return codeGenStmt(newIfElse, env);
      } else if (stmt.elsebody) {
        var elsebodyStmts = stmt.elsebody.map(s => codeGenStmt(s, env)).flat().join("\n");
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
  const emptyEnv = {locals: new Map<string, boolean>(), classes: new Map<string, ClassEnv>()};
  const [vars, funs, classes, stmts] = varsFunsClassStmts(program);

  classes.forEach(c => buildClassEnv(c, emptyEnv));
  const classesCode: string[] = classes.map(c => codeGenClassDef(c, emptyEnv));
  const allClasses = classesCode.join("\n\n");

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
      (memory (import "memory" "heap") 1)
      (func $print_num (import "imports" "print_num") (param i32) (result i32))
      (func $print_bool (import "imports" "print_bool") (param i32) (result i32))
      (func $print_none (import "imports" "print_none") (param i32) (result i32))
      (global $heap$ptr (mut i32) (i32.const 4))
      ${varDecls}
      ${allClasses}

      ${allFuns}
      (func (export "_start") ${retType}
        ${main}
        ${retVal}
      )
    ) 
  `;
}
