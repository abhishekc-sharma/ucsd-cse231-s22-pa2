import {expect} from 'chai'
import {parser} from 'lezer-python'
import {parseProgram, parseStmt, parseDef, parseExpr, parseLiteral, parseType, parseParameters, parseArguments} from '../core/parser'

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
      {tag: "literal", value: {tag: "number", value: 2}},
      {tag: "literal", value: {tag: "false"}},
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

describe('parseLiteral', () => {
  it('parses None literal', () => {
    const source = "None";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const literal = parseLiteral(source, cursor);
    expect(literal).to.deep.equal({tag: "none"});
  });

  it('parses a integer literal', () => {
    const source = "1234";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const literal = parseLiteral(source, cursor);
    expect(literal).to.deep.equal({tag: "number", value: 1234});
  });

  it('throws error on floating literal', () => {
    const source = "1234.123";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    expect(() => parseLiteral(source, cursor)).to.throw();
  });

  it('parses the boolean literal "True"', () => {
    const source = "True";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseLiteral(source, cursor);
    expect(expr).to.deep.equal({tag: "true"});
  });

  it('parses the boolean literal "False"', () => {
    const source = "False";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseLiteral(source, cursor);
    expect(expr).to.deep.equal({tag: "false"});
  });
});

describe('parseExpr', () => {
  it('parses a function call expression', () => {
    const source = "foo(bar, baz)";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({
      tag: "call", name: "foo", args: [
        {tag: "id", name: "bar"},
        {tag: "id", name: "baz"},
      ]
    });
  });

  it('parses unary expression', () => {
    const source = "-x";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({tag: "unop", op: "-", expr: {tag: "id", name: "x"}});
  });

  it('parses unary expression', () => {
    const source = "~x";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    expect(() => parseExpr(source, cursor)).to.throw();
  });

  it('parses a binary expression', () => {
    const source = "x + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();
    cursor.firstChild();

    const expr = parseExpr(source, cursor);
    expect(expr).to.deep.equal({tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}});
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
  it('parses a pass statement', () => {
    const source = "pass"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, true);
    expect(stmt).to.deep.equal({tag: "pass"});
  });

  it('parses a return statement', () => {
    const source = "return x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, true);
    expect(stmt).to.deep.equal({tag: "return", value: {tag: "id", name: "x"}});
  });

  it('parses a return statement with no expression', () => {
    const source = "return"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, true);
    expect(stmt).to.deep.equal({tag: "return", value: {tag: "literal", value: {tag: "none"}}});
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
    expect(stmt).to.deep.equal({tag: "assign", name: "x", value: {tag: "literal", value: {tag: "number", value: 10}}});
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

  it('parses if statement - 0', () => {
    const source = "if True:\n\tsum = sum + n\n\tn = n + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true"}},
      ifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    });
  });

  it('parses if statement - 1', () => {
    const source = "if True:\n\tsum = sum + n\n\tn = n + 1\nelif False:\n\tsum = sum + n\n\tn = n + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true"}},
      ifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elifcond: {tag: "literal", value: {tag: "false"}},
      elifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    });
  });

  it('parses if statement - 2', () => {
    const source = "if True:\n\tsum = sum + n\n\tn = n + 1\nelif False:\n\tsum = sum + n\n\tn = n + 1\nelse:\n\tsum = sum + n\n\tn = n + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true"}},
      ifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elifcond: {tag: "literal", value: {tag: "false"}},
      elifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elsebody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    });
  });

  it('parses if statement - 3', () => {
    const source = "if True:\n\tsum = sum + n\n\tn = n + 1\nelse:\n\tsum = sum + n\n\tn = n + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true"}},
      ifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elsebody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    });
  });

  it('throws error on if statement with multiple elif branches', () => {
    const source = "if True:\n\tsum = sum + n\n\tn = n + 1\nelif False:\n\tsum = sum + n\n\tn = n + 1\nelif False:\n\tsum = sum + n\n\tn = n + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    expect(() => parseStmt(source, cursor, false)).to.throw();

  })

  it('parses a while loop - 0', () => {
    const source = "while True:\n\tpass"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({tag: "while", cond: {tag: "literal", value: {tag: "true"}}, body: [{tag: "pass"}]});
  });

  it('parses a while loop - 1', () => {
    const source = "while n <= 5:\n\tsum = sum + n\n\tn = n + 1";
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseStmt(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "while",
      cond: {tag: "binop", op: "<=", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 5}}},
      body: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    });
  });
});

describe('parseDef', () => {
  it('parses a integer variable definition', () => {
    const source = "x : int = 10"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, true);
    expect(stmt).to.deep.equal({tag: "variable", def: {name: "x", type: "int", value: {tag: "number", value: 10}}});
  });

  it('parses a boolean variable definition', () => {
    const source = "x : bool = True"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, false);
    expect(stmt).to.deep.equal({tag: "variable", def: {name: "x", type: "bool", value: {tag: "true"}}});
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
      tag: "function",
      def: {
        name: "foo",
        params: [{name: "x", typ: "int"}, {name: "y", typ: "bool"}],
        ret: "int",
        defs: [],
        body: [{tag: "return", value: {tag: "id", name: "x"}}]
      }
    });
  });

  it('parses a function definition without return type annotation', () => {
    const source = "def foo(x: int, y: bool):\n\treturn x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "function",
      def: {
        name: "foo",
        params: [{name: "x", typ: "int"}, {name: "y", typ: "bool"}],
        ret: "none",
        defs: [],
        body: [{tag: "return", value: {tag: "id", name: "x"}}]
      }
    });
  });

  it('parses a function definition with multiple statements in function body', () => {
    const source = "def foo(x: int, y: bool):\n\tx = y\n\treturn x"
    const cursor = parser.parse(source).cursor();

    cursor.firstChild();

    const stmt = parseDef(source, cursor, false);
    expect(stmt).to.deep.equal({
      tag: "function",
      def: {
        name: "foo",
        params: [{name: "x", typ: "int"}, {name: "y", typ: "bool"}],
        ret: "none",
        defs: [],
        body: [
          {tag: "assign", name: "x", value: {tag: "id", name: "y"}},
          {tag: "return", value: {tag: "id", name: "x"}}
        ]
      }
    });
  })

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

    expect(program).to.deep.equal({
      defs: [
        {tag: "variable", def: {name: "x", type: "int", value: {tag: "number", value: 5}}},
        {tag: "variable", def: {name: "y", type: "bool", value: {tag: "true"}}},
      ],
      stmts: [],
    });
  });

  it('parses a program with function definitions', () => {
    const source = "def id(x: bool) -> bool:\n\treturn x\ndef add1(x: int) -> int:\n\treturn x + 1"
    const program = parseProgram(source);

    expect(program).to.deep.equal({
      defs: [
        {
          tag: "function",
          def: {
            name: "id",
            params: [{name: "x", typ: "bool"}],
            ret: "bool",
            defs: [],
            body: [{tag: "return", value: {tag: "id", name: "x"}}]
          }
        },
        {
          tag: "function",
          def: {
            name: "add1",
            params: [{name: "x", typ: "int"}],
            ret: "int",
            defs: [],
            body: [{tag: "return", value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "literal", value: {tag: "number", value: 1}}}}]
          }
        }
      ],
      stmts: [],
    });
  });

  it('parses a program with statements', () => {
    const source = "True\nx = 5"
    const program = parseProgram(source);

    expect(program).to.deep.equal({
      defs: [],
      stmts: [
        {
          tag: "expr",
          expr: {tag: "literal", value: {tag: "true"}},
        },
        {
          tag: "assign",
          name: "x",
          value: {tag: "literal", value: {tag: "number", value: 5}},
        }
      ]
    });
  });

  it('parses a program with variable definitions followed by statements', () => {
    const source = "x: int = 0\nx = x + 1"
    const program = parseProgram(source);

    expect(program).to.deep.equal({
      defs: [
        {tag: "variable", def: {name: "x", type: "int", value: {tag: "number", value: 0}}},

      ],
      stmts: [
        {
          tag: "assign",
          name: "x",
          value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "literal", value: {tag: "number", value: 1}}},
        }
      ]
    });
  });

  it('parses a program with variable and function definitions followed by statements - 0', () => {
    const source = "def add1(x: int) -> int:\n\treturn x + 1\nx: int = 0\nx = add1(x)"
    const program = parseProgram(source);

    expect(program).to.deep.equal({
      defs: [
        {
          tag: "function",
          def: {
            name: "add1",
            params: [{name: "x", typ: "int"}],
            ret: "int",
            defs: [],
            body: [{tag: "return", value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "literal", value: {tag: "number", value: 1}}}}]
          }
        },
        {tag: "variable", def: {name: "x", type: "int", value: {tag: "number", value: 0}}},

      ],
      stmts: [
        {
          tag: "assign",
          name: "x",
          value: {tag: "call", name: "add1", args: [{tag: "id", name: "x"}]}
        }
      ]
    });
  });

  it('parses a program with variable and function definitions followed by statements - 1', () => {
    const source = "x: int = 0\ndef add1(x: int) -> int:\n\treturn x + 1\nx = add1(x)"
    const program = parseProgram(source);

    expect(program).to.deep.equal({
      defs: [
        {tag: "variable", def: {name: "x", type: "int", value: {tag: "number", value: 0}}},
        {
          tag: "function",
          def: {
            name: "add1",
            params: [{name: "x", typ: "int"}],
            ret: "int",
            defs: [],
            body: [{tag: "return", value: {tag: "binop", op: "+", "lhs": {tag: "id", name: "x"}, "rhs": {tag: "literal", value: {tag: "number", value: 1}}}}]
          }
        },

      ],
      stmts: [
        {
          tag: "assign",
          name: "x",
          value: {tag: "call", name: "add1", args: [{tag: "id", name: "x"}]}
        }
      ]
    });
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
