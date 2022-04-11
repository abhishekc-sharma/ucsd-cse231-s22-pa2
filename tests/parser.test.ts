import {expect} from 'chai'
import { parser } from 'lezer-python'
import { parseProgram, parseStmt, parseDef, parseExpr, parseType, parseParameters, parseArguments } from '../core/parser'

describe('parseType', () => {
  it('parses type int', () => {
    const source = "x : int = 5";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.firstChild();
    cursor.nextSibling();

    const type = parseType(source, cursor); 
    expect(type).to.equal("int");
  });

  it('parses type bool', () => {
    const source = "x : bool = True";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.firstChild();
    cursor.nextSibling();

    const type = parseType(source, cursor); 
    expect(type).to.equal("bool");
  });

  it('throws error on invalid type', () => {
    const source = "x : unknown = True";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.firstChild();
    cursor.nextSibling();

    expect(() => parseType(source, cursor)).to.throw();
  });

});

describe('parseArguments', () => {
  it('parses an empty argument list', () => {
    const source = "foo()";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();

    const args = parseArguments(source, cursor); 
    expect(args).to.deep.equal([]);
  });

  it('parses argument list with one argument', () => {
    const source = "foo(x)";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();

    const args = parseArguments(source, cursor); 
    expect(args).to.deep.equal([{tag: "id", name: "x"}]);
  });

  it('parses argument list with multiple arguments', () => {
    const source = "foo(x, 2, False)";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();

    const args = parseArguments(source, cursor); 
    expect(args).to.deep.equal([
      {tag: "id", name: "x"},
      {tag: "number", value: 2},
      {tag: "false"},
    ]);
  });
});

describe('parseParameters', () => {
  it('parses an empty parameter list', () => {
    const source = "def foo():\n\treturn";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.nextSibling();

    const params = parseParameters(source, cursor);
    expect(params).to.deep.equal([]);
  });

  it('parses parameter list with one parameter', () => {
    const source = "def foo(x: int):\n\treturn";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.nextSibling();

    const params = parseParameters(source, cursor);
    expect(params).to.deep.equal([{name: "x", typ: "int"}]);
  });

  it('parses parameter list with multiple parameters', () => {
    const source = "def foo(x: int, y: bool):\n\treturn";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.nextSibling();

    const params = parseParameters(source, cursor);
    expect(params).to.deep.equal([
      {name: "x", typ: "int"},
      {name: "y", typ: "bool"}
    ]);
  });

  it('parameter list expects type annotations', () => {
    const source = "def foo(x):\n\treturn";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.nextSibling();

    expect(() => parseParameters(source, cursor)).to.throw();
  });

  it('parameter list expects , to separate parameters', () => {
    const source = "def foo(x: int y: int):\n\treturn";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();
    cursor.nextSibling();
    cursor.nextSibling();

    expect(() => parseParameters(source, cursor)).to.throw();
  })
});

describe('parseExpr', () => {
  it('parses a integer literal expression', () => {
    const source = "1234";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({tag: "number", value: 1234});
  });

  it('parses the boolean literal expression "True"', () => {
    const source = "True";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({tag: "true"});
  });

  it('parses the boolean literal expression "False"', () => {
    const source = "False";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({tag: "false"});
  });

  it('parses a function call expression', () => {
    const source = "foo(bar, baz)";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({tag: "call", name: "foo", args: [
      {tag: "id", name: "bar"},
      {tag: "id", name: "baz"},
    ]});
  });

  it('parses a binary expression', () => {
    const source = "x + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "number", value: 1}});
  });

  it('throws error on binary expression with invalid/unknown operator', () => {
    const source = "x / 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    expect(() => parseExpr(source, cursor)).to.throw();
  });
});

describe('parseStmt', () => {
  it('parses a return statement', () => {
    const source = "return x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, true);
    expect(stmt).to.deep.equal({tag: "return", value: {tag: "id", name: "x"}});
  });

  it('throws an error on return statement outside a function', () => {
    const source = "return x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    expect(() => parseStmt(source, cursor, false)).to.throw();
  });

  it('parses an assignment statement', () => {
    const source = "x = 10"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({tag: "assign", name: "x", value: {tag: "number", value: 10}});
  });

  it('throws error on assignment statement with type annotation', () => {
    const source = "x : int = 10"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    expect(() => parseStmt(source, cursor, false)).to.throw();
  });

  it('parses an expression statement', () => {
    const source = "x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({tag: "expr", expr: {tag: "id", name: "x"}});
  });
});

describe('parseDef', () => {
  it('parses a integer variable definition', () => {
    const source = "x : int = 10"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, true);
    expect(stmt).to.deep.equal({tag: "vardef", name: "x", type: "int", value: {tag: "number", value: 10}, global: false});
  });

  it('parses a boolean variable definition', () => {
    const source = "x : bool = True"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, false);
    expect(stmt).to.deep.equal({tag: "vardef", name: "x", type: "bool", value: {tag: "true"}, global: true});
  });

  it('throws error on variable definition with missing type annotation', () => {
    const source = "x = 10"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    expect(() => parseDef(source, cursor, false)).to.throw();
  });

  it('throws error on variable definition with non-literal initializer', () => {
    const source = "x: int = 10 + 1"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    expect(() => parseDef(source, cursor, false)).to.throw();
  });

  it('parses a function definition with return type annotation', () => {
    const source = "def foo(x: int, y: bool) -> int:\n\treturn x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "define",
      name: "foo",
      params: [ {name: "x", typ: "int"}, {name: "y", typ: "bool"}],
      ret: "int",
      body: [{tag: "return", value: {tag: "id", name: "x"}}]
    });
  });

  it('parses a function definition without return type annotation', () => {
    const source = "def foo(x: int, y: bool):\n\treturn x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "define",
      name: "foo",
      params: [ {name: "x", typ: "int"}, {name: "y", typ: "bool"}],
      ret: "none",
      body: [{tag: "return", value: {tag: "id", name: "x"}}]
    });
  });

  it('throws an error on nested function definition', () => {
    const source = "def id(x: int) -> int:\n\tdef foo(y: bool) -> bool:\n\t\treturn y\n\treturn x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    expect(() => parseDef(source, cursor, false)).to.throw();
  });
});

describe('parseProgram', () => {
  it('parses a program with variable definitions', () => {
    const source = "x: int = 5\ny: bool = True"
    const program = parseProgram(source);

    expect(program).to.deep.equal([
      {tag: "vardef", name: "x", type: "int", value: {tag: "number", value: 5}, global: true},
      {tag: "vardef", name: "y", type: "bool", value: {tag: "true"}, global: true},
    ]);
  });

  it('parses a program with function definitions', () => {
    const source = "def id(x: bool) -> bool:\n\treturn x\ndef add1(x: int) -> int:\n\treturn x + 1"
    const program = parseProgram(source);

    expect(program).to.deep.equal([
      {
        tag: "define",
        name: "id",
        params: [ {name: "x", typ: "bool"}],
        ret: "bool",
        body: [{tag: "return", value: {tag: "id", name: "x"}}]
      },
      {
        tag: "define",
        name: "add1",
        params: [ {name: "x", typ: "int"}],
        ret: "int",
        body: [{tag: "return", value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "number", value: 1}}}]
      }
    ]);
  });

  it('parses a program with statements', () => {
    const source = "True\nx = 5"
    const program = parseProgram(source);

    expect(program).to.deep.equal([
      {
        tag: "expr",
        expr: {tag: "true"},
      },
      {
        tag: "assign",
        name: "x",
        value: {tag: "number", value: 5}
      }
    ]);
  });

  it('parses a program with variable definitions followed by statements', () => {
    const source = "x: int = 0\nx = x + 1"
    const program = parseProgram(source);

    expect(program).to.deep.equal([
      {tag: "vardef", name: "x", type: "int", value: {tag: "number", value: 0}, global: true},
      {
        tag: "assign",
        name: "x",
        value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "number", value: 1}}
      }
    ]);
  });

  it('parses a program with variable and function definitions followed by statements - 0', () => {
    const source = "def add1(x: int) -> int:\n\treturn x + 1\nx: int = 0\nx = add1(x)"
    const program = parseProgram(source);

    expect(program).to.deep.equal([
      {
        tag: "define",
        name: "add1",
        params: [ {name: "x", typ: "int"}],
        ret: "int",
        body: [{tag: "return", value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "number", value: 1}}}]
      },
      {tag: "vardef", name: "x", type: "int", value: {tag: "number", value: 0}, global: true},
      {
        tag: "assign",
        name: "x",
        value: {tag: "call", name: "add1", args: [{tag: "id", name: "x"}]}
      }
    ]);
  });

  it('parses a program with variable and function definitions followed by statements - 1', () => {
    const source = "x: int = 0\ndef add1(x: int) -> int:\n\treturn x + 1\nx = add1(x)"
    const program = parseProgram(source);

    expect(program).to.deep.equal([
      {tag: "vardef", name: "x", type: "int", value: {tag: "number", value: 0}, global: true},
      {
        tag: "define",
        name: "add1",
        params: [ {name: "x", typ: "int"}],
        ret: "int",
        body: [{tag: "return", value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "number", value: 1}}}]
      },
      {
        tag: "assign",
        name: "x",
        value: {tag: "call", name: "add1", args: [{tag: "id", name: "x"}]}
      }
    ]);
  });

  it('throws error when variable definition occurs after statements', () => {
    const source = "x: int = 0\nx = x + 1\ny:int = 1"
    expect(() => parseProgram(source)).to.throw();
  });

  it('throws error when function definition occurs after statements', () => {
    const source = "x: int = 0\nx = x + 1\ndef add1(x: int) -> int:\n\treturn x + 1"
    expect(() => parseProgram(source)).to.throw();
  });
});

