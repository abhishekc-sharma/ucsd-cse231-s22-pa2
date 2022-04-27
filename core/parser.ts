import {TreeCursor} from 'lezer';
import {parser} from 'lezer-python';
import {Program, Parameter, Stmt, Expr, Literal, Def, ClassDef, FunDef, VarDef, Type, isBinOp, isUnOp} from './ast';

export type ParsingEnv = {inFunction: boolean, inClass: boolean};

export function parseProgram(source: string): Program<any> {
  const t = parser.parse(source).cursor();
  // cursor is initially focused on the Script node
  t.firstChild(); // focus on the first statement

  const [defs, stmts] = parseDefsAndStmts(source, t, {inFunction: false, inClass: false});
  return {defs, stmts};
}

export function parseDefsAndStmts(source: string, t: TreeCursor, env: ParsingEnv): [Def<any>[], Stmt<any>[]] {
  // parse the leading definitions.
  const [defs, foundStmt] = parseDefs(source, t, env);

  // if we never found a statement after the
  // definitions then we are done.
  if (!foundStmt) {
    return [defs, []];
  }

  // parse the statements.
  const stmts = parseStmts(source, t, env);
  return [defs, stmts];
}

export function parseDefs(source: string, t: TreeCursor, env: ParsingEnv): [Def<any>[], boolean] {
  const defs = [];
  let found = false;
  do {
    if (!isDef(t)) {
      // found our first non-definition statement.
      found = true;
      break;
    }
    defs.push(parseDef(source, t, env));
  } while (t.nextSibling());
  return [defs, found];
}

// Parse a sequence of statements.
// inFunction - are we currently inside a function definition.
// defMode - controls if variable definitions / function definition statements are allowed.
//
// Pre-condition - t is focused on the first statement in a sequence of statements
// Post-condition - t is focused on the last statement in the sequence of statements just parsed
export function parseStmts(source: string, t: TreeCursor, env: ParsingEnv): Stmt<any>[] {
  const stmts = [];

  // parse all the statements.
  do {
    stmts.push(parseStmt(source, t, env));
  } while (t.nextSibling());

  return stmts;
}

// Checks if the currently focused statement is a variable/function definition
// 
// Pre-condition - t is focused on a statement node
// Post-condition - t is focused on the same statement node
function isDef(t: TreeCursor): boolean {
  switch (t.type.name) {
    case "FunctionDefinition":
      // function definition is always a definition
      return true;
    case "AssignStatement":
      // assignment statement is a definition if it has
      // a type annotation
      t.firstChild(); // focus on variable name
      t.nextSibling(); // focus on "=" or TypeDef

      // @ts-ignore
      let ret = t.type.name === "TypeDef";
      t.parent(); // pop to AssignStatement
      return ret;
    case "ClassDefinition":
      // class definition is always a definition
      return true;
    default:
      // no other types of definitions supported currently
      return false;
  }
}

// Parse a definition
// inFunction - are we currently within a function definition.
//
// Pre-condition - t is focused on a statement node
// Post-condition - t is focused on the same statement node
export function parseDef(s: string, t: TreeCursor, env: ParsingEnv): Def<any> {
  switch (t.type.name) {
    case "AssignStatement":
      const varDef = parseVarDef(s, t);
      return {tag: "variable", def: varDef};
    case "FunctionDefinition":
      const funDef = parseFunDef(s, t, env);
      return {tag: "function", def: funDef};
    case "ClassDefinition":
      const classDef = parseClassDef(s, t, env);
      return {tag: "class", def: classDef};
    default:
      throw new Error(`ParseError: expecting a variable/function/class definition: ${s.substring(t.from, t.to)}`);
  }
}

function parseVarDef(s: string, t: TreeCursor): VarDef<any> {
  if (t.type.name === "AssignStatement") {
    t.firstChild(); // focus on variable name
    const name = s.substring(t.from, t.to);

    t.nextSibling(); // focus on type definition

    // Not sure if there is a better way to deal with this. TypeScript is not able to
    // figure out that t.nextSibling mutates t and changes t.type.name.
    // So explicitly ignoring the TypeScript error for now.
    // @ts-ignore
    if (t.type.name !== "TypeDef") {
      t.parent();
      throw new Error("ParseError: Missing type annotation in variable definition: " + s.substring(t.from, t.to));
    }

    t.firstChild(); // focus on :
    t.nextSibling(); // focus on VariableName
    const type = parseType(s, t);

    t.parent(); // focus back on type definition
    t.nextSibling(); // focus on =
    t.nextSibling(); // focus on expression being assigned

    // rhs of variable definitions are restricted to literals only
    const value = parseLiteral(s, t);

    t.parent(); // focus back on AssignStatement

    return {name, type, value}
  } else {
    throw new Error(`ParseError: expecting variable definition: ${s.substring(t.from, t.to)}`);
  }
}

function parseFunDef(s: string, t: TreeCursor, env: ParsingEnv): FunDef<any> {
  if (t.type.name === "FunctionDefinition") {
    // nested fucntion definitions are not allowed
    if (env.inFunction) {
      throw new Error("ParseError: Nested function definition not supported: " + s.substring(t.from, t.to));
    }
    t.firstChild();  // Focus on def
    t.nextSibling(); // Focus on name of function
    let name = s.substring(t.from, t.to);
    t.nextSibling(); // Focus on ParamList
    var params = parseParameters(s, t);
    t.nextSibling(); // Focus on Body or TypeDef
    let ret: Type = "none";
    let maybeTD = t;
    if (maybeTD.type.name === "TypeDef") {
      t.firstChild();
      ret = parseType(s, t);
      t.parent();
    }
    t.nextSibling(); // Focus on single statement (for now)
    t.firstChild();  // Focus on :
    t.nextSibling();
    const [defs, body] = parseDefsAndStmts(s, t, {...env, inFunction: true});
    t.parent();      // Pop to Body
    t.parent();      // Pop to FunctionDefinition
    return {
      name, params, defs, body, ret
    }
  } else {
    throw new Error(`ParseError: expecting function definition: ${s.substring(t.from, t.to)}`);
  }
}

function parseClassDef(s: string, t: TreeCursor, env: ParsingEnv): ClassDef<any> {
  if (t.type.name !== "ClassDefinition") {
    throw new Error(`ParseError: expecting class definition: ${s.substring(t.from, t.to)}`);
  }

  t.firstChild(); // focus on "class"

  t.nextSibling(); // focus on VariableName
  const name = s.substring(t.from, t.to);

  t.nextSibling(); // focus on ArgList
  t.firstChild(); // focus on "("
  t.nextSibling(); // focus on VariableName
  if (s.substring(t.from, t.to) === ")") {
    t.parent();
    throw new Error(`ParseError: class definition must have exactly one parent class: ${s.substring(t.from, t.to)}`);
  }
  const parent = s.substring(t.from, t.to);

  t.nextSibling(); // focus on ")
  if (s.substring(t.from, t.to) !== ")") {
    t.parent();
    throw new Error(`ParseError: class definition must have exactly one parent class: ${s.substring(t.from, t.to)}`);
  }

  t.parent(); // pop to ArgList
  t.nextSibling(); // focus on Body
  t.firstChild(); // focus on ":"
  t.nextSibling(); // focus on first statement

  const [defs, foundStmt] = parseDefs(s, t, {...env, inClass: true});
  if (foundStmt) {
    throw new Error(`ParseError: unexpected statement inside class definition: ${s.substring(t.from, t.to)}`);
  }

  const fields = defs.filter(d => d.tag === "variable").map(d => d.def);
  const methods = defs.filter(d => d.tag === "function").map(d => d.def);

  t.parent(); // pop to Body
  t.parent(); // pop to ClassDefinition

  // @ts-ignore
  return {name, parent, fields, methods};
}

// Parse a non-definitional statement
// inFunction - are we currently within a function definition.
//
// Pre-condition - t is focused on a statement node
// Post-condition - t is focused on the same statement node
export function parseStmt(s: string, t: TreeCursor, env: ParsingEnv): Stmt<any> {
  switch (t.type.name) {
    case "PassStatement":
      return {tag: "pass"};
    case "ReturnStatement":
      // check if we are in a function for return statement to be allowed
      if (!env.inFunction) {
        throw new Error("ParseError: Return statement not allowed outside function body: " + s.substring(t.from, t.to));
      }

      // default to returning None of return does not have an expression
      if (s.substring(t.from, t.to) === "return") {
        return {tag: "return", value: {tag: "literal", value: {"tag": "none"}}};
      }

      t.firstChild();  // focus return keyword
      t.nextSibling(); // focus on the expression returned
      var value = parseExpr(s, t);
      t.parent();
      return {tag: "return", value};
    case "AssignStatement":
      t.firstChild(); // focused on name (the first child)
      var name = s.substring(t.from, t.to);
      t.nextSibling(); // focused on = sign. May need this for complex tasks, like +=!

      // assignment should not have type annotation
      // @ts-ignore
      if (t.type.name == "TypeDef") {
        t.parent();
        throw new Error("ParseError: Unexpected type annotation in variable assignment: " + s.substring(t.from, t.to));
      }
      t.nextSibling(); // focused on the value expression

      var value = parseExpr(s, t);
      t.parent(); // focus back on assignment statement
      return {tag: "assign", name, value};
    case "ExpressionStatement":
      t.firstChild(); // The child is some kind of expression, the
      // ExpressionStatement is just a wrapper with no information
      var expr = parseExpr(s, t);
      t.parent();
      return {tag: "expr", expr: expr};
    case "WhileStatement":
      t.firstChild(); // focus on while
      t.nextSibling(); // focus on loop condition
      let loopCond = parseExpr(s, t);
      t.nextSibling(); // focus on loop body
      t.firstChild(); // focus on :
      t.nextSibling(); // focus on first statement in body

      // parse statements in body, not allowing definitions
      let body = parseStmts(s, t, env);

      t.parent();      // Pop to Body
      t.parent();      // Pop to WhileStatement
      return {tag: "while", cond: loopCond, body: body};
    case "IfStatement":
      t.firstChild(); // focus on if
      // parse the condition and body of the if branch
      let {cond: ifCond, body: ifBody} = parseCondAndBody(s, t, env, "if");

      if (!t.nextSibling()) {
        // no elif or else, just return what we have so far
        t.parent(); // focus on IfStatement
        return {tag: "ifelse", ifcond: ifCond, ifbody: ifBody};
      }

      let ret: Stmt<any> = {tag: "ifelse", ifcond: ifCond, ifbody: ifBody};

      // try to parse an elif branch
      let elif = parseCondAndBody(s, t, env, "elif");
      if (elif) {
        // we found an elif branch
        // add the cond and body to ret
        ret.elifcond = elif.cond;
        ret.elifbody = elif.body;

        if (!t.nextSibling()) {
          // no else branch, just return what we have so far
          t.parent(); // focus on IfStatement
          return ret;
        }
      }

      // current supporting only a single elif branch
      // so the next node has to be an "else"
      if (s.substring(t.from, t.to) != "else") {
        throw new Error(`ParseError: Cannot have more than one elif branch`);
      }

      t.nextSibling(); // focus on body
      t.firstChild(); // focus on ;
      t.nextSibling(); // focus on first statement in body
      // parse the statements in the body of else branch without
      // allowing definitions
      let elseBody = parseStmts(s, t, env);
      t.parent(); // Pop to Body
      t.parent(); // Pop to IfStatement
      ret.elsebody = elseBody;
      return ret;
    default:
      throw new Error(`ParseError: Unexpected statement: ` + s.substring(t.from, t.to));
  }
}

// An if/elif condition and body
type ElifElse<A> = {cond: Expr<A>, body: Stmt<A>[]} | undefined

type ElifElseWhat = "if" | "elif"

// Parse an if/elif branch condition and body
//
// inFunction - are we currently inside a function definition
// what - do we expect to parse an "if" or an "elif" branch
//
// Pre-condition - t is focused on the "if" or "elif" part of an IfStatement
// Post-condition - t is focused on the Body node corresponding to the branch of the IfStatement
function parseCondAndBody(s: string, t: TreeCursor, env: ParsingEnv, what: ElifElseWhat): ElifElse<any> {
  // check that we have the expected branch
  if (s.substring(t.from, t.to) != what) {
    return undefined;
  }

  t.nextSibling(); // focus on condition
  let cond = parseExpr(s, t);

  t.nextSibling(); // focus on body
  t.firstChild(); // focus on ;
  t.nextSibling(); // focus on first statement in body
  // parse the branch body without allowing definitions 
  let body = parseStmts(s, t, env);

  t.parent(); // pop to body
  return {cond, body};
}

export function parseType(s: string, t: TreeCursor): Type {
  switch (t.type.name) {
    case "VariableName":
      const name = s.substring(t.from, t.to);
      if (name !== "int" && name !== "bool") {
        return {tag: "object", name};
      }
      return name;
    default:
      throw new Error("ParseError: Unknown type: " + t.type.name)

  }
}

export function parseParameters(s: string, t: TreeCursor): Parameter[] {
  t.firstChild();  // Focuses on open paren
  const parameters = []
  t.nextSibling(); // Focuses on a VariableName
  while (t.type.name !== ")") {
    let name = s.substring(t.from, t.to);
    t.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
    let nextTagName = t.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
    if (nextTagName !== "TypeDef") {throw new Error("ParseError: Missing type annotation for parameter " + name)};
    t.firstChild();  // Enter TypeDef
    t.nextSibling(); // Focuses on type itself
    let typ = parseType(s, t);
    t.parent();
    t.nextSibling(); // Move on to comma or ")"
    parameters.push({name, typ});
    t.nextSibling(); // Focuses on a VariableName
  }
  t.parent();       // Pop to ParamList
  return parameters;
}

// Parse an expression
//
// Pre-condition - t is focused on an Expression node
// Post-confition - t is focused on the same Expression node
export function parseExpr(s: string, t: TreeCursor): Expr<any> {
  switch (t.type.name) {
    case "None":
    case "Boolean":
    case "Number":
      let literal = parseLiteral(s, t);
      return {tag: "literal", value: literal};
    case "VariableName":
      return {tag: "id", name: s.substring(t.from, t.to)};
    case "CallExpression":
      t.firstChild(); // Focus name
      var name = s.substring(t.from, t.to);
      t.nextSibling(); // Focus ArgList
      t.firstChild(); // Focus open paren
      var args = parseArguments(s, t);
      var result: Expr<any> = {tag: "call", name, args: args};
      t.parent();
      return result;
    case "BinaryExpression":
      t.firstChild(); // go to lhs
      const lhsExpr = parseExpr(s, t);
      t.nextSibling(); // go to op
      var opStr = s.substring(t.from, t.to);
      if (!isBinOp(opStr)) {
        throw new Error(`ParseError: Unknown or unhandled binary operator: ${opStr}`);
      }
      t.nextSibling(); // go to rhs
      const rhsExpr = parseExpr(s, t);
      t.parent();
      return {
        tag: "binop",
        op: opStr,
        lhs: lhsExpr,
        rhs: rhsExpr
      };
    case "UnaryExpression":
      t.firstChild();
      let unOpStr = s.substring(t.from, t.to);
      if (!isUnOp(unOpStr)) {
        throw new Error(`ParseError: Unknown or unhandled unary op: ${unOpStr}`);
      }
      t.nextSibling(); // go to expr
      const expr = parseExpr(s, t);
      t.parent();
      return {
        tag: "unop",
        op: unOpStr,
        expr: expr,
      };
    case "ParenthesizedExpression":
      t.firstChild(); // focus (
      t.nextSibling(); // focus on expression
      let pexpr = parseExpr(s, t);
      t.nextSibling();
      if (s.substring(t.from, t.to) !== ")") {
        t.parent();
        throw new Error(`ParseError: Missing/Mismatched closing parenthesis: ` + s.substring(t.from, t.to));
      }
      t.parent();
      return pexpr;
    default:
      throw new Error(`ParseError: Unexpected expression: ` + s.substring(t.from, t.to));
  }
}

export function parseLiteral(s: string, t: TreeCursor): Literal<any> {
  switch (t.type.name) {
    case "None":
      return {tag: "none"};
    case "Boolean":
      if (s.substring(t.from, t.to) === "True") {return {tag: "true"};}
      else {return {tag: "false"};}
    case "Number":
      let number = Number(s.substring(t.from, t.to));
      let integer = parseInt(s.substring(t.from, t.to), 10);

      // Floating point literals are not allowed
      // so parsing as Number and Int should give
      // the same result.
      if (integer !== number) {
        throw new Error(`ParseError: Invalid integer literal ${s.substring(t.from, t.to)}`);
      }

      return {tag: "number", value: integer};
    default:
      throw new Error(`ParseError: Invalid expression where literal is expected: ${s.substring(t.from, t.to)}`);
  }
}

export function parseArguments(s: string, c: TreeCursor): Expr<any>[] {
  c.firstChild();  // Focuses on open paren
  const args = [];
  c.nextSibling();
  while (c.type.name !== ")") {
    let expr = parseExpr(s, c);
    args.push(expr);
    c.nextSibling(); // Focuses on either "," or ")"
    c.nextSibling(); // Focuses on a VariableName
  }
  c.parent();       // Pop to ArgList
  return args;
}
