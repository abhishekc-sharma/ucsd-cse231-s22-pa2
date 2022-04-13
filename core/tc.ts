import { Expr, Stmt, Type, BinOp, UnOp, Parameter} from "./ast";

// information stored for a variable/function in the Variable Typing Environment
export type EnvType =
  | { 
      tag: "variable",

      // checked type of the variable
      type: Type,
      
      // is the variable global 
      global: boolean
    }
  | { 
      tag: "function",

      // the checked type of the function
      type: [Type[], Type]
  }

// Variable Typing Environment
// Maps variable and function names to their types
type VariableEnv = Map<string, EnvType>;

// Typing Environment
// ret - return type of function we are currently in
// vars - the current variable typing environment
// inFunc - are we currently in a function definition
export type TypingEnv =
  | { ret: Type, vars: VariableEnv, inFunc: boolean }

// create an empty typing environment
function emptyEnv() : TypingEnv {
  let vars = new Map<string, EnvType>();
  return {
    ret: "none",
    vars: vars,
    inFunc: false,
  }
}

// expected type for unary operators
// expr - expected type for the operand
// res - type of result of the operator
type UnOpType =
  | { expr: Type, res: Type }

// type to store expected type information
// for all the currently supported unary operators
type UnOpTypes = { [k in UnOp]: UnOpType }

// type information for all unary operators
const unOpTypes: UnOpTypes = {
  "-": { expr: "int", res: "int" },
  "not": { expr: "bool", res: "bool" }
};

// expected type for binary operators
// lhs - expected type for the lhs operand
// rhs - expected type for the rhs operand
// res - type of result of the operator
type BinOpType =
  | { lhs: Type, rhs: Type, res: Type}

// type to store expected type information
// for all the currently supported binary operators
// Each operator maps to an Array since some operators
// like ==, != work for multiple types.
type BinOpTypes = { [k in BinOp]: Array<BinOpType> }

// type information for all binary operators
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

// type check an expression against the current typing environment
//
// Invariant - expected to fill in the annotation (a) field for all AST nodes
export function tcExpr(e : Expr<any>, env: TypingEnv) : Expr<Type> {
  switch(e.tag) {
    case "none": return { ...e, a: "none" };
    case "number": return { ...e, a: "int" };
    case "true": return { ...e, a: "bool" };
    case "false": return { ...e, a: "bool" };
    case "unop": {
      // type check the operand
      const exprTyped = tcExpr(e.expr, env);

      // get expected type for unary operator
      const unOpType = unOpTypes[e.op];

      // check if operand type is allowed for this operator
      if(exprTyped.a !== unOpType.expr) {
        throw new Error(`TypeError : Cannot apply unary operator ${e.op} on type ${exprTyped.a}`);
      }

      return { ...e, expr: exprTyped, a: unOpType.res };
    }
    case "binop": {
      //TODO: Can this even happen since we will reject during parsing
      //if(!isBinOp(e.op)) {
      //  throw new Error(`Unhandled op ${e.op}`);
      //}

      // type check both the operands
      const lhsTyped = tcExpr(e.lhs, env);
      const rhsTyped = tcExpr(e.rhs, env);

      // find the first compatible type for this operator and computed operand types
      const binOpType = binOpTypes[e.op].filter(binOpType => lhsTyped.a == binOpType.lhs && rhsTyped.a == binOpType.rhs)[0];

      // if we didn't find anything its a type error
      if(!binOpType) {
        throw new Error(`TypeError: Cannot apply binary operator ${e.op} on types ${lhsTyped.a} and ${rhsTyped.a}`);
      }

      return { ...e, lhs: lhsTyped, rhs: rhsTyped, a: binOpType.res };
    }
    case "id": {
      // variable environment should have the variable
      if(!env.vars.has(e.name)) {
        throw new Error(`TypeError: Not a variable: ${e.name}`);
      }

      // retrieve type information for the variable
      let envType = env.vars.get(e.name);

      // variable should not be a function
      if(envType.tag === "function") {
        throw new Error(`TypeError: Unsupported use of function ${e.name} as a first-class identifier`);
      }

      return { ...e, a: envType.type };
    }
    case "call":
      // special-case check for the built-ins
      if(e.name === "print") {
        if(e.args.length !== 1) {
          throw new Error("TypeError: print expects a single argument");
        }
        const newArgs = [tcExpr(e.args[0], env)];
        const res : Expr<Type> = { ...e, a: "none", args: newArgs } ;
        return res;
      }

      // variable environment should have the function
      if(!env.vars.has(e.name)) {
        throw new Error(`TypeError: not a function: ${e.name}`);
      }

      // retrieve type information for the function
      let envType = env.vars.get(e.name);

      // the function should not be a variable
      if(envType.tag === "variable") {
        throw new Error(`TypeError: not a function: ${e.name}`);
      }

      const [args, ret] = envType.type;
      // check that the number of arguments matches
      if(args.length !== e.args.length) {
        throw new Error(`TypeError: Function ${e.name} expects ${args.length} arguments but got ${e.args.length}`);
      }

      const newArgs = args.map((a, i) => {
        // type check the argument expression
        const argTyped = tcExpr(e.args[i], env);
        // check that the type matches what is expected
        if(a !== argTyped.a) {
          throw new Error(`TypeError: Got ${argTyped} as argument ${i + 1}, expected ${a} in call to ${e.name}`);
        }
        return argTyped;
      });

      return { ...e, a: ret, args: newArgs };
  }
}

// Check if a statement has a return in all its paths
function definitelyReturns(s : Stmt<Type>) : boolean {
  if(s.tag === "return") {
    // return trvially always returns
    return true;
  } else if(s.tag === "ifelse") {
    // an if without an else branch
    // is never guaranteed to return
    if(!s.elsebody) {
      return false;
    }

    let ret = true;

    // we recursively check that each branch body has some
    // statement that is guaranteed to return
    ret = ret && s.ifbody.findIndex(definitelyReturns) !== -1;
    if(s.elifbody) {
      ret = ret && s.elifbody.findIndex(definitelyReturns) !== -1;
    }
    ret = ret && s.elsebody.findIndex(definitelyReturns) !== -1;
    return ret;
  } else {
    // anything else does not return
    // NOTE: ignoring while loop as its too hard to calculate
    return false;
  }
}

// check if an array of parameters has any with duplicate names
// on throw an error if its does
function checkDuplicateParams(params: Array<Parameter>) {
  let s = new Set();
  params.forEach(p => {
    if(s.has(p.name)) {
      throw new Error(`Duplicate declaration of identier in same scope: ${p.name}`);
    }

    s.add(p.name);
  });
}

// type check a statement
//
// Invariant - fills in the type annotation for all contained expressions
export function tcStmt(s : Stmt<any>, env : TypingEnv) : Stmt<Type> {
  switch(s.tag) {
    case "pass": {
      return { ...s };
    }
    case "vardef": {
      let envType = env.vars.get(s.name);

      // if we are currently in global scope and theres already
      // a function with the same name
      if (envType && !env.inFunc && envType.tag === "function") {
        throw new Error(`TypeError: Duplicate definition of identifier in same scope: ${s.name}`);
      }

      // if we are currently in global scope and theres already
      // a variable with the same name
      if (envType && !env.inFunc && envType.tag === "variable") {
        throw new Error(`TypeError: Duplicate definition of identifier in same scope: ${s.name}`);
      }

      // if we are currently in local scope and theres already
      // a local variable with the same name
      if (envType && env.inFunc && envType.tag === "variable" && !envType.global) {
        throw new Error(`TypeError: Duplicate definition of identifier in same scope: ${s.name}`);
      }

      // type check the value being assigned
      const value = tcExpr(s.value, env);

      // check that the value we are assigning has the correct type
      if(value.a !== s.type) { 
        throw new Error(`TypeError: Got ${value.a} assigning to ${s.name}, expected ${s.type}`);
      }

      // add the variable to the typing environment
      env.vars.set(s.name, {tag: "variable", type: s.type, global: !env.inFunc});
      return { ...s, value };
    }
    case "assign": {
      // variable should be there in the environment
      // before assignment
      if(!env.vars.has(s.name)) {
        throw new Error(`TypError: Not a variable: ${s.name}`);
      }

      // get the type information for the variable
      let envType = env.vars.get(s.name);


      // name should not be bound to function
      if(envType.tag === "function") {
        throw new Error(`TypError: Not a variable: ${s.name}`);
      }

      // cannot assign to global variable if we are within a function
      if(env.inFunc && envType.global) {
        throw new Error(`TypeError: Cannot assign to variable not explicitly declared in this scope: ${s.name}`);
      }

      // type check the value being assigned
      const rhs = tcExpr(s.value, env);

      // check that it matches the expected type
      if(envType.type !== rhs.a) {
        throw new Error(`TypeError: Cannot assign value of type ${rhs.a} to variable ${s.name} with type ${envType.type}`);
      }
      return { ...s, value: rhs };
    }
    case "define": {
      // check if environment already has variable with same name
      if(env.vars.has(s.name)) {
        throw new Error(`TypeError: Duplicate definition of identifier in same scope: ${s.name}`);
      }

      // adding the function to the environment before proceeding
      // so that the function is available in the environment when
      // type checking the body so that recursive calls typecheck
      env.vars.set(s.name, {tag: "function", type: [
        s.params.map(p => p.typ),
        s.ret,
      ]});

      // variable environment for body should contains all the existing
      // variables
      const bodyvars = new Map<string, EnvType>(env.vars.entries());

      // check if the parameters have any duplicate names
      checkDuplicateParams(s.params);
      // add parameters to variable environment for the body
      s.params.forEach(p => { bodyvars.set(p.name, {tag: "variable", type: p.typ, global: false})});
      
      // typing environment updates ret and inFunc in addition to variable environment
      let newEnv = { ret: s.ret, vars: bodyvars, inFunc: true };

      // type check all the statements in the body
      const newStmts = s.body.map(bs => tcStmt(bs, newEnv));

      // if the function returns a type other than none then all the paths
      // in the function body should have a return statement somewhere
      if(s.ret !== "none" && s.body.findIndex(definitelyReturns) === -1) {
        throw new Error(`TypeError: All paths in this function/method must have a return statement: ${s.name}`);
      }
      
      return { ...s, body: newStmts };
    }
    case "expr": {
      const ret = tcExpr(s.expr, env);
      return { ...s, expr: ret };
    }
    case "return": {
      const valTyp = tcExpr(s.value, env);
      if(valTyp.a !== env.ret) {
        throw new Error(`TypeError: ${valTyp.a} returned but ${env.ret} expected`);
      }
      return { ...s, value: valTyp };
    }
    case "while": {
      const condTyp = tcExpr(s.cond, env);
      if(condTyp.a !== "bool") {
          throw new Error(`TypeError: Condition expression cannot be of type ${condTyp.a}`);
      }
      const newStmts = s.body.map(bs => tcStmt(bs, env));

      return { ...s, cond: condTyp, body: newStmts};
    }
    case "ifelse": {
      const sTyp = { ...s };

      sTyp.ifcond = tcExpr(s.ifcond, env);
      if(sTyp.ifcond.a !== "bool") {
        throw new Error(`TypeError: Condition expression cannot be of type ${sTyp.ifcond.a}`);
      }

      sTyp.ifbody = s.ifbody.map(bs => tcStmt(bs, env));

      if(s.elifcond) {
        sTyp.elifcond = tcExpr(s.elifcond, env);
        if(sTyp.elifcond.a !== "bool") {
          throw new Error(`TypeError: Condition expression cannot be of type ${sTyp.elifcond.a}`);
        }
        sTyp.elifbody = s.elifbody.map(bs => tcStmt(bs, env));
      }

      if(s.elsebody) {
        sTyp.elsebody = s.elsebody.map(bs => tcStmt(bs, env));
      }

      return sTyp;
    }
  }
}

// type checks the entire program
//
// Invariant - fills in the type annotation for all contained expressions
export function tcProgram(p : Stmt<any>[]) : Stmt<Type>[] {
  // start with an empty environment
  const env = emptyEnv();

  // type check each statement
  return p.map(s => tcStmt(s, env));
}
