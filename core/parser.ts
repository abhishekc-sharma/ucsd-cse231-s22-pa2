import { TreeCursor } from 'lezer';
import {parser} from 'lezer-python';
import {Parameter, Stmt, Expr, Type, isBinOp, isUnOp} from './ast';

export function parseProgram(source : string) : Array<Stmt<any>> {
  const t = parser.parse(source).cursor();
  // cursor is initially focused on the Script node
  t.firstChild(); // focus on the first statement
  return parseStmts(source, t, false, true);
}

// Parse a sequence of statements.
// inFunction - are we currently inside a function definition.
// defMode - controls if variable definitions / function definition statements are allowed.
//
// Pre-condition - t is focused on the first statement in a sequence of statements
// Post-condition - t is focused on the last statement in the sequence of statements just parsed
export function parseStmts(source : string, t : TreeCursor, inFunction: boolean, defMode: boolean) : Array<Stmt<any>> {
  const stmts = [];

  // if definition statements are allowed, try to parse them
  // until we hit the first non-definition statement or have
  // no more statements to parse in the sequence.
  if(defMode) {
    do {
      if(!isDef(t)) {
        // found our first non-definition statement.
        defMode = false;
        break;
      }
      stmts.push(parseDef(source, t, inFunction));
    } while(t.nextSibling());
  }

  // if defMode is still true, this means that the above
  // loop exitted because it exhausted all statements in
  // the sequence. In that case we are done.
  if(defMode) {
    return stmts;
  }

  // parse the remaining non-definition statements in the
  // sequence.
  do {
    stmts.push(parseStmt(source, t, inFunction));
  } while(t.nextSibling());

  return stmts;
}

// Checks if the currently focused statement is a variable/function definition
// 
// Pre-condition - t is focused on a statement node
// Post-condition - t is focused on the same statement node
function isDef(t : TreeCursor) : boolean {
  switch(t.type.name) {
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
    default:
      // no other types of definitions supported currently
      return false;
  }
}

// Parse a definition statement
// inFunction - are we currently within a function definition.
//
// Pre-condition - t is focused on a statement node
// Post-condition - t is focused on the same statement node
export function parseDef(s : string, t : TreeCursor, inFunction: boolean) : Stmt<any> {
  switch(t.type.name) {
    case "AssignStatement":
      t.firstChild(); // focus on variable name
      const vname = s.substring(t.from, t.to);

      t.nextSibling(); // focus on type definition

      // Not sure if there is a better way to deal with this. TypeScript is not able to
      // figure out that t.nextSibling mutates t and changes t.type.name.
      // So explicitly ignoring the TypeScript error for now.
      // @ts-ignore
      if(t.type.name !== "TypeDef") {
        t.parent();
        throw new Error("ParseError: Missing type annotation in variable definition: " + s.substring(t.from, t.to));
      }

      t.firstChild(); // focus on :
      t.nextSibling(); // focus on VariableName
      const type = parseType(s, t);

      t.parent(); // focus back on type definition
      t.nextSibling(); // focus on =
      t.nextSibling(); // focus on expression being assigned

      const value = parseExpr(s, t);

      // rhs of variable definitions are restricted to int/bool/none literals only
      if(value.tag !== "number" && value.tag !== "true" && value.tag !== "false" && value.tag !== "none") {
        t.parent();
        throw new Error("ParseError: Variable definitions can only have literals on the right hand side: " + s.substring(t.from, t.to));
      }

      t.parent(); // focus back on AssignStatement

      return { tag: "vardef", name: vname, type, value, global: !inFunction }

    case "FunctionDefinition":
      // nested fucntion definitions are not allowed
      if(inFunction) {
        throw new Error("ParseError: Nested function definition not supported: " + s.substring(t.from, t.to));
      }
      t.firstChild();  // Focus on def
      t.nextSibling(); // Focus on name of function
      let fname = s.substring(t.from, t.to);
      t.nextSibling(); // Focus on ParamList
      var params = parseParameters(s, t);
      t.nextSibling(); // Focus on Body or TypeDef
      let ret : Type = "none";
      let maybeTD = t;
      if(maybeTD.type.name === "TypeDef") {
        t.firstChild();
        ret = parseType(s, t);
        t.parent();
      }
      t.nextSibling(); // Focus on single statement (for now)
      t.firstChild();  // Focus on :
      t.nextSibling();
      const body = parseStmts(s, t, true, true);
      t.parent();      // Pop to Body
      t.parent();      // Pop to FunctionDefinition
      return {
        tag: "define",
        name: fname, params, body, ret
      }
  }
}

// Parse a non-definitional statement
// inFunction - are we currently within a function definition.
//
// Pre-condition - t is focused on a statement node
// Post-condition - t is focused on the same statement node
export function parseStmt(s : string, t : TreeCursor, inFunction: boolean) : Stmt<any> {
  switch(t.type.name) {
    case "PassStatement":
      return { tag: "pass" };
    case "ReturnStatement":
      // check if we are in a function for return statement to be allowed
      if(!inFunction) {
        throw new Error("ParseError: Return statement not allowed outside function body: " + s.substring(t.from, t.to));
      }

      // default to returning None of return does not have an expression
      if(s.substring(t.from, t.to) === "return") {
        return { tag: "return", value: {tag: "none"}};
      }

      t.firstChild();  // focus return keyword
      t.nextSibling(); // focus on the expression returned
      var value = parseExpr(s, t);
      t.parent();
      return { tag: "return", value };
    case "AssignStatement":
      t.firstChild(); // focused on name (the first child)
      var name = s.substring(t.from, t.to);
      t.nextSibling(); // focused on = sign. May need this for complex tasks, like +=!

      // assignment should not have type annotation
      // @ts-ignore
      if(t.type.name == "TypeDef") {
        t.parent();
        throw new Error("ParseError: Unexpected type annotation in variable assignment: " + s.substring(t.from, t.to));
      }
      t.nextSibling(); // focused on the value expression

      var value = parseExpr(s, t);
      t.parent(); // focus back on assignment statement
      return { tag: "assign", name, value };
    case "ExpressionStatement":
      t.firstChild(); // The child is some kind of expression, the
                      // ExpressionStatement is just a wrapper with no information
      var expr = parseExpr(s, t);
      t.parent();
      return { tag: "expr", expr: expr };
    case "WhileStatement":
      t.firstChild(); // focus on while
      t.nextSibling(); // focus on loop condition
      let loopCond = parseExpr(s, t);
      t.nextSibling(); // focus on loop body
      t.firstChild(); // focus on :
      t.nextSibling(); // focus on first statement in body
      
      // parse statements in body, not allowing definitions
      let body = parseStmts(s, t, inFunction, false);
      
      t.parent();      // Pop to Body
      t.parent();      // Pop to WhileStatement
      return { tag: "while", cond: loopCond, body: body};
    case "IfStatement":
      t.firstChild(); // focus on if
      // parse the condition and body of the if branch
      let {cond: ifCond, body: ifBody} = parseCondAndBody(s, t, inFunction, "if");

      if(!t.nextSibling()) {
        // no elif or else, just return what we have so far
        return { tag: "ifelse", ifcond: ifCond, ifbody: ifBody};
      }

      let ret: Stmt<any> = { tag: "ifelse", ifcond: ifCond, ifbody: ifBody};

      // try to parse an elif branch
      let elif = parseCondAndBody(s, t, inFunction, "elif");
      if(elif) {
        // we found an elif branch
        // add the cond and body to ret
        ret.elifcond = elif.cond;
        ret.elifbody = elif.body;

        if(!t.nextSibling()) {
          // no else branch, just return what we have so far
          return ret;
        }
      }

      // current supporting only a single elif branch
      // so the next node has to be an "else"
      if(s.substring(t.from, t.to) != "else") {
        throw new Error(`ParseError: Cannot have more than one elif branch`);
      }

      t.nextSibling(); // focus on body
      t.firstChild(); // focus on ;
      t.nextSibling(); // focus on first statement in body
      // parse the statements in the body of else branch without
      // allowing definitions
      let elseBody = parseStmts(s, t, inFunction, false);
      t.parent(); // Pop to Body
      t.parent(); // Pop to IfStatement
      ret.elsebody = elseBody;
      return ret;
    default:
      throw new Error(`ParseError: Unexpected statement: ` + s.substring(t.from, t.to));
  }
}

// An if/elif condition and body
type ElifElse<A> = { cond: Expr<A>, body: Stmt<A>[]} | undefined

type ElifElseWhat = "if" | "elif"

// Parse an if/elif branch condition and body
//
// inFunction - are we currently inside a function definition
// what - do we expect to parse an "if" or an "elif" branch
//
// Pre-condition - t is focused on the "if" or "elif" part of an IfStatement
// Post-condition - t is focused on the Body node corresponding to the branch of the IfStatement
function parseCondAndBody(s : string, t : TreeCursor, inFunction: boolean, what: ElifElseWhat) : ElifElse<any> {
  // check that we have the expected branch
  if(s.substring(t.from, t.to) != what) {
    return undefined;
  }

  t.nextSibling(); // focus on condition
  let cond = parseExpr(s, t);

  t.nextSibling(); // focus on body
  t.firstChild(); // focus on ;
  t.nextSibling(); // focus on first statement in body
  // parse the branch body without allowing definitions 
  let body = parseStmts(s, t, inFunction, false);

  t.parent(); // pop to body
  return { cond, body };
}

export function parseType(s : string, t : TreeCursor) : Type {
  switch(t.type.name) {
    case "VariableName":
      const name = s.substring(t.from, t.to);
      if(name !== "int" && name !== "bool") {
        throw new Error("ParseError: Unknown type: " + name)
      }
      return name;
    default:
      throw new Error("ParseError: Unknown type: " + t.type.name)

  }
}

export function parseParameters(s : string, t : TreeCursor) : Parameter[] {
  t.firstChild();  // Focuses on open paren
  const parameters = []
  t.nextSibling(); // Focuses on a VariableName
  while(t.type.name !== ")") {
    let name = s.substring(t.from, t.to);
    t.nextSibling(); // Focuses on "TypeDef", hopefully, or "," if mistake
    let nextTagName = t.type.name; // NOTE(joe): a bit of a hack so the next line doesn't if-split
    if(nextTagName !== "TypeDef") { throw new Error("ParseError: Missing type annotation for parameter " + name)};
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
export function parseExpr(s : string, t : TreeCursor) : Expr<any> {
  switch(t.type.name) {
    case "None":
      return { tag: "none" };
    case "Boolean":
      if(s.substring(t.from, t.to) === "True") { return { tag: "true" }; }
      else { return { tag: "false" }; }
    case "Number":
      let number = Number(s.substring(t.from, t.to));
      let integer = parseInt(s.substring(t.from, t.to), 10);

      // Floating point literals are not allowed
      // so parsing as Number and Int should give
      // the same result.
      if(integer !== number) {
        throw new Error(`ParseError: Invalid integer literal ${s.substring(t.from, t.to)}`);
      }

      return { tag: "number", value: integer };
    case "VariableName":
      return { tag: "id", name: s.substring(t.from, t.to) };
    case "CallExpression":
      t.firstChild(); // Focus name
      var name = s.substring(t.from, t.to);
      t.nextSibling(); // Focus ArgList
      t.firstChild(); // Focus open paren
      var args = parseArguments(s, t);
      var result : Expr<any> = { tag: "call", name, args: args};
      t.parent();
      return result;
    case "BinaryExpression":
      t.firstChild(); // go to lhs
      const lhsExpr = parseExpr(s, t);
      t.nextSibling(); // go to op
      var opStr = s.substring(t.from, t.to);
      if(!isBinOp(opStr)) {
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
      if(!isUnOp(unOpStr)) {
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
      if(s.substring(t.from, t.to) !== ")") {
        t.parent();
        throw new Error(`ParseError: Missing/Mismatched closing paranthesis: ` + s.substring(t.from, t.to));
      }
      t.parent();
      return pexpr;
    default:
      throw new Error(`ParseError: Unexpected expression: ` + s.substring(t.from, t.to));
  }
}

export function parseArguments(s : string, c : TreeCursor) : Expr<any>[] {
  c.firstChild();  // Focuses on open paren
  const args = [];
  c.nextSibling();
  while(c.type.name !== ")") {
    let expr = parseExpr(s, c);
    args.push(expr);
    c.nextSibling(); // Focuses on either "," or ")"
    c.nextSibling(); // Focuses on a VariableName
  } 
  c.parent();       // Pop to ArgList
  return args;
}
