import { Expr, Stmt, Type, BinOp, UnOp} from "./ast";

export type EnvType =
  | { tag: "variable", type: Type, global: boolean }
  | { tag: "function", type: [Type[], Type]}

export type VariableEnv = Map<string, EnvType>;

export type TypingEnv =
  | { ret: Type, vars: VariableEnv, inFunc: boolean }

function emptyEnv() : TypingEnv {
  let vars = new Map<string, EnvType>();
  return {
    ret: "none",
    vars: vars,
    inFunc: false,
  }
}

type UnOpType =
  | { expr: Type, res: Type }

type UnOpTypes = { [k in UnOp]: UnOpType }

const unOpTypes: UnOpTypes = {
  "-": { expr: "int", res: "int" },
  "not": { expr: "bool", res: "bool" }
};

type BinOpType =
  | { lhs: Type, rhs: Type, res: Type}

type BinOpTypes = { [k in BinOp]: Array<BinOpType> }

const binOpTypes: BinOpTypes = {
  "+": [{ lhs: "int", rhs: "int", res: "int"}],
  "-": [{ lhs: "int", rhs: "int", res: "int"}],
  "*": [{ lhs: "int", rhs: "int", res: "int"}],
  "//": [{ lhs: "int", rhs: "int", res: "int"}],
  "%": [{ lhs: "int", rhs: "int", res: "int"}],
  "==": [
    { lhs: "int", rhs: "int", res: "bool"},
    { lhs: "bool", rhs: "bool", res: "bool"}
  ],
  "!=": [
    { lhs: "int", rhs: "int", res: "bool"},
    { lhs: "bool", rhs: "bool", res: "bool"}
  ],
  "<=": [{ lhs: "int", rhs: "int", res: "bool"}],
  ">=": [{ lhs: "int", rhs: "int", res: "bool"}],
  "<": [{ lhs: "int", rhs: "int", res: "bool"}],
  ">": [{ lhs: "int", rhs: "int", res: "bool"}],
  "and": [{ lhs: "bool", rhs: "bool", res: "bool"}],
  "or": [{ lhs: "bool", rhs: "bool", res: "bool"}],
  "is": [{ lhs: "none", rhs: "none", res: "bool"}],
}

export function tcExpr(e : Expr<any>, env: TypingEnv) : Expr<Type> {
  switch(e.tag) {
    case "none": return { ...e, a: "none" };
    case "number": return { ...e, a: "int" };
    case "true": return { ...e, a: "bool" };
    case "false": return { ...e, a: "bool" };
    case "unop": {
      const exprTyped = tcExpr(e.expr, env);
      const unOpType = unOpTypes[e.op];

      if(exprTyped.a !== unOpType.expr) {
        throw new Error(`Invalid type ${exprTyped.a} for unary operator ${e.op}`);
      }

      return { ...e, expr: exprTyped, a: unOpType.res };
    }
    case "binop": {
      //TODO: Can this even happen since we will reject during parsing
      //if(!isBinOp(e.op)) {
      //  throw new Error(`Unhandled op ${e.op}`);
      //}

      const lhsTyped = tcExpr(e.lhs, env);
      const rhsTyped = tcExpr(e.rhs, env);

      const binOpType = binOpTypes[e.op].filter(binOpType => lhsTyped.a == binOpType.lhs && rhsTyped.a == binOpType.rhs)[0];

      if(!binOpType) {
        throw new Error(`Invalid types ${lhsTyped.a} and ${rhsTyped.a} for binary operator ${e.op}`);
      }

      return { ...e, lhs: lhsTyped, rhs: rhsTyped, a: binOpType.res };
    }
    case "id": {
      if(!env.vars.has(e.name)) {
        throw new Error(`Undefined variable ${e.name}`);
      }

      let envType = env.vars.get(e.name);
      if(envType.tag === "function") {
        throw new Error(`Unsupported use of function ${e.name} as a first-class identifier`);
      }

      return { ...e, a: envType.type };
    }
    case "call":
      if(e.name === "print") {
        if(e.args.length !== 1) {
          throw new Error("print expects a single argument");
        }
        const newArgs = [tcExpr(e.args[0], env)];
        const res : Expr<Type> = { ...e, a: "none", args: newArgs } ;
        return res;
      }

      if(!env.vars.has(e.name)) {
        throw new Error(`function ${e.name} not found`);
      }

      let envType = env.vars.get(e.name);
      if(envType.tag === "variable") {
        throw new Error(`Invalid use of variable ${e.name} as a function`);
      }

      const [args, ret] = envType.type;
      if(args.length !== e.args.length) {
        throw new Error(`Function ${e.name} expects ${args.length} arguments but got ${e.args.length}`);
      }

      const newArgs = args.map((a, i) => {
        const argTyped = tcExpr(e.args[i], env);
        if(a !== argTyped.a) {
          throw new Error(`Got ${argTyped} as argument ${i + 1}, expected ${a} in call to ${e.name}`);
        }
        return argTyped;
      });

      return { ...e, a: ret, args: newArgs };
  }
}

export function tcStmt(s : Stmt<any>, env : TypingEnv) : Stmt<Type> {
  switch(s.tag) {
    case "pass": {
      return { ...s };
    }
    case "vardef": {
      let envType = env.vars.get(s.name);
      if (envType && !env.inFunc && envType.tag === "function") {
        throw new Error(`Redefinition of existing function definition ${s.name}`);
      }

      if (envType && !env.inFunc && envType.tag === "variable") {
        throw new Error(`Redefinition of existing global variable definition ${s.name}`);
      }

      if (envType && env.inFunc && envType.tag === "variable" && !envType.global) {
        throw new Error(`Redefinition of existing local variable definition ${s.name}`);
      }

      const value = tcExpr(s.value, env);
      if(value.a !== s.type) { throw new Error(`Got ${value.a} assigning to ${s.name}, expected ${s.type}`); }
      env.vars.set(s.name, {tag: "variable", type: s.type, global: !env.inFunc});
      return { ...s, value };
    }
    case "assign": {
      if(!env.vars.has(s.name)) {
        throw new Error(`Assigning to unbound variable ${s.name}`);
      }

      let envType = env.vars.get(s.name);
      if(envType.tag === "function") {
        throw new Error(`Assignment to function ${s.name}`);
      }

      if(env.inFunc && envType.global) {
        throw new Error(`Assignment to global variable ${s.name}`);
      }

      const rhs = tcExpr(s.value, env);
      if(envType.type !== rhs.a) {
        throw new Error(`Cannot assign value of type ${rhs.a} to variable ${s.name} with type ${envType.type}`);
      }
      return { ...s, value: rhs };
    }
    case "define": {
      if(env.vars.has(s.name)) {
        throw new Error(`Defining function with existing name ${s.name}`);
      }
      const bodyvars = new Map<string, EnvType>(env.vars.entries());
      s.params.forEach(p => { bodyvars.set(p.name, {tag: "variable", type: p.typ, global: false})});
      let newEnv = { ret: s.ret, vars: bodyvars, inFunc: true };
      const newStmts = s.body.map(bs => tcStmt(bs, newEnv));
      env.vars.set(s.name, {tag: "function", type: [
        s.params.map(p => p.typ),
        s.ret,
      ]});
      return { ...s, body: newStmts };
    }
    case "expr": {
      const ret = tcExpr(s.expr, env);
      return { ...s, expr: ret };
    }
    case "return": {
      const valTyp = tcExpr(s.value, env);
      if(valTyp.a !== env.ret) {
        throw new Error(`${valTyp} returned but ${env.ret} expected.`);
      }
      return { ...s, value: valTyp };
    }
  }
}

export function tcProgram(p : Stmt<any>[]) : Stmt<Type>[] {
  const env = emptyEnv();
  /*p.forEach(s => {
    if(s.tag === "define") {
      functions.set(s.name, [s.params.map(p => p.typ), s.ret]);
    }
  });*/

  /*return p.map(s => {
    if(s.tag === "vardef") {
      const rhs = tcExpr(s.value, functions, globals);
      globals.set(s.name, rhs.a);
      return { ...s, value: rhs };
    }
    else {
      const res = tcStmt(s, functions, globals, "none");
      return res;
    }
  });*/

 return p.map(s => tcStmt(s, env));
}
