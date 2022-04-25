import {expect} from 'chai'
import * as ast from '../core/ast'
import {tcLiteral, tcExpr, tcStmt, tcVarDef, tcFunDef, tcProgram, TypingEnv, EnvType} from '../core/tc'

describe('tcLiteral', () => {
  it('typechecks None literal', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};
    let ast = tcLiteral({tag: "none"}, env);
    expect(ast).to.deep.equal({tag: "none", a: "none"});
  });

  it('typechecks boolean literal True', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};
    let ast = tcLiteral({tag: "true"}, env);
    expect(ast).to.deep.equal({tag: "true", a: "bool"});
  });

  it('typechecks boolean literal False', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    let ast = tcLiteral({tag: "false"}, env);
    expect(ast).to.deep.equal({tag: "false", a: "bool"});
  });

  it('typechecks number literal', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    let ast = tcLiteral({tag: "number", value: 10}, env);
    expect(ast).to.deep.equal({tag: "number", value: 10, a: "int"});
  });
});

describe('tcExpr', () => {
  it('typechecks identifier local variable', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "int", global: false}
      })),
      inFunc: false
    };

    let ast = tcExpr({tag: "id", name: "x"}, env);
    expect(ast).to.deep.equal({tag: "id", name: "x", a: "int"});
  });

  it('typechecks identifier global variable', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true}
      })),
      inFunc: false
    };

    let ast = tcExpr({tag: "id", name: "x"}, env);
    expect(ast).to.deep.equal({tag: "id", name: "x", a: "bool"});
  });

  it('throws error on undefined identifier variable', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true}
      })),
      inFunc: false
    };

    expect(() => tcExpr({tag: "id", name: "y"}, env)).to.throw();
  });

  it('throws error on function used as a variable', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "function", type: [["int"], "int"]}
      })),
      inFunc: false
    };

    expect(() => tcExpr({tag: "id", name: "x"}, env)).to.throw();
  });

  it('typechecks calls to the print builtin function', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    let ast = tcExpr({tag: "call", name: "print", args: [{tag: "literal", value: {tag: "number", value: 10}}]}, env);
    expect(ast).to.deep.equal({tag: "call", name: "print", args: [{tag: "literal", value: {tag: "number", value: 10, a: "int"}, a: "int"}], a: "none"});
  });

  it('throws error on incorrect number of arguments to print builtin function', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    expect(() => tcExpr({tag: "call", name: "print", args: [{tag: "literal", value: {tag: "number", value: 10}}, {tag: "literal", value: {tag: "true"}}]}, env)).to.throw();
  });

  it('typechecks calls to functions with multiple arguments', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]}
      })),
      inFunc: false
    };

    let ast = tcExpr({
      tag: "call", name: "add_pred", args: [
        {tag: "literal", value: {tag: "number", value: 10}},
        {tag: "literal", value: {tag: "number", value: 5}}
      ]
    }, env);

    expect(ast).to.deep.equal({
      tag: "call", name: "add_pred", args: [
        {tag: "literal", value: {tag: "number", value: 10, a: "int"}, a: "int"},
        {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"},
      ], a: "bool"
    });
  });

  it('typechecks calls to functions with no arguments', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [[], "bool"]}
      })),
      inFunc: false
    };

    let ast = tcExpr({tag: "call", name: "add_pred", args: []}, env);

    expect(ast).to.deep.equal({tag: "call", name: "add_pred", args: [], a: "bool"});
  });

  it('throws error on calls to undefined functions', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(),
      inFunc: false
    };

    expect(() => tcExpr({tag: "call", name: "add_pred", args: []}, env)).to.throw();
  });

  it('throws error on calls to functions with incorrect number of arguments', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]}
      })),
      inFunc: false
    };

    expect(() => tcExpr({tag: "call", name: "add_pred", args: [{tag: "literal", value: {tag: "number", value: 5}}]}, env)).to.throw();
  });

  it('throws error on calls to variables as functions', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "variable", type: "int", global: true}
      })),
      inFunc: false
    };

    expect(() => tcExpr({tag: "call", name: "foo", args: [{tag: "literal", value: {tag: "number", value: 5}}]}, env)).to.throw();
  });

  it('throws error on calls to functions with incorrect argument type', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]}
      })),
      inFunc: false
    };

    expect(() => tcExpr({tag: "call", name: "add_pred", args: [{tag: "literal", value: {tag: "number", value: 5}}, {tag: "literal", value: {tag: "true"}}]}, env)).to.throw();
  });

  it('typechecks unary operator -', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    let ast = tcExpr({
      tag: "unop",
      op: "-",
      expr: {tag: "literal", value: {tag: "number", value: 5}},
    }, env);

    expect(ast).to.deep.equal({
      tag: "unop",
      op: "-",
      expr: {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"},
      a: "int"
    });
  });

  it('typechecks unary operator not', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    let ast = tcExpr({
      tag: "unop",
      op: "not",
      expr: {tag: "literal", value: {tag: "true"}},
    }, env);

    expect(ast).to.deep.equal({
      tag: "unop",
      op: "not",
      expr: {tag: "literal", value: {tag: "true", a: "bool"}, a: "bool"},
      a: "bool"
    });
  });

  it('throws error on invalid type to unary operator', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    expect(() => tcExpr({
      tag: "unop",
      op: "-",
      expr: {tag: "literal", value: {tag: "true"}},
    }, env)).to.throw();
  });

  it('typechecks binary operator +', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    let ast = tcExpr({
      tag: "binop",
      op: "+",
      lhs: {tag: "literal", value: {tag: "number", value: 5}},
      rhs: {tag: "literal", value: {tag: "number", value: 10}}
    }, env);

    expect(ast).to.deep.equal({
      tag: "binop",
      op: "+",
      lhs: {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"},
      rhs: {tag: "literal", value: {tag: "number", value: 10, a: "int"}, a: "int"},
      a: "int"
    });
  });

  it('throws error on incorrect lhs type for binary operator +', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    expect(() => tcExpr({
      tag: "binop",
      op: "+",
      lhs: {tag: "literal", value: {tag: "false"}},
      rhs: {tag: "literal", value: {tag: "number", value: 10}}
    }, env)).to.throw();
  });

  it('throws error on incorrect lhs type for binary operator +', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    expect(() => tcExpr({
      tag: "binop",
      op: "+",
      lhs: {tag: "literal", value: {tag: "number", value: 10}},
      rhs: {tag: "literal", value: {tag: "false"}},
    }, env)).to.throw();
  });
});

describe('tcStmt', () => {
  it('typechecks pass statements', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    const ast = tcStmt({
      tag: "pass",
    }, env);

    expect(ast).to.deep.equal({tag: "pass", a: "none"});
  });

  it('typechecks global variable definition', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    const ast = tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env);

    expect(ast).to.deep.equal({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0, a: "int"},
      a: "none",
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: true});
  });

  it('typechecks local variable definition', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: true};

    const ast = tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env);

    expect(ast).to.deep.equal({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0, a: "int"},
      a: "none",
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: false});
  });

  it('typechecks local variable definition with shadowing global variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true}
      })), inFunc: true
    };

    const ast = tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env);

    expect(ast).to.deep.equal({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0, a: "int"},
      a: "none",
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: false});
  });

  it('typechecks local variable definition with shadowing function definition', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "function", type: [[], "int"]}
      })), inFunc: true
    };

    const ast = tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env);

    expect(ast).to.deep.equal({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0, a: "int"},
      a: "none",
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: false});
  })

  it('throws error when global variable definition clashes with function definition', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env)).to.throw();
  });

  it('throws error when global variable definition clashes with existing global variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true}
      })), inFunc: false
    };

    expect(() => tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env)).to.throw();
  });

  it('throws error when local variable definition clashes with existing local variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: false}
      })), inFunc: true
    };

    expect(() => tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env)).to.throw();
  });

  it('throws error when variable definition is initialized with value of the wrong type', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
      })), inFunc: false
    };

    expect(() => tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "true"},
    }, env)).to.throw();
  });

  it('typechecks global variable assignment', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "int", global: true}
      })), inFunc: false
    };

    let ast = tcStmt({
      tag: "assign",
      name: "x",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)

    expect(ast).to.deep.equal({
      tag: "assign",
      name: "x",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"},
      a: "none"
    });
  });

  it('typechecks local variable assignment', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "int", global: false}
      })), inFunc: true
    };

    let ast = tcStmt({
      tag: "assign",
      name: "x",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)

    expect(ast).to.deep.equal({
      tag: "assign",
      name: "x",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"},
      a: "none"
    });
  });

  it('errors on local assignment to global variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "int", global: true}
      })), inFunc: true
    };

    expect(() => tcStmt({
      tag: "assign",
      name: "x",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('errors on assignment to undefined variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true}
      })), inFunc: false
    };

    expect(() => tcStmt({
      tag: "assign",
      name: "y",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('errors on assignment with expression of the wrong type', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true},
        "y": {tag: "variable", type: "int", global: true}
      })), inFunc: false
    };

    expect(() => tcStmt({
      tag: "assign",
      name: "x",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "y"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('errors on assignment to function', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcStmt({
      tag: "assign",
      name: "x",
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('typechecks function definition', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    const ast = tcFunDef({
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {tag: "return", value: {tag: "id", name: "x"}}
      ]
    }, env);

    expect(ast).to.deep.equal({
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1, a: "int"}, a: "none"}, a: "none"},
      ],
      body: [
        {tag: "return", value: {tag: "id", name: "x", a: "int"}, a: "none"}
      ],
      a: "none",
    });

    expect(env.vars.get("foo")).to.deep.equal({tag: "function", type: [["int"], "int"]})
  });

  it('typechecks function definition with none return type', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false};

    const ast = tcFunDef({
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "none",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: []
    }, env);

    expect(ast).to.deep.equal({
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "none",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1, a: "int"}, a: "none"}, a: "none"},
      ],
      body: [],
      a: "none",
    });

    expect(env.vars.get("foo")).to.deep.equal({tag: "function", type: [["int"], "none"]})
  });

  it('throws an error when defining a function that does not return on all paths - 0', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcFunDef({
      name: "bar",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: []
    }, env)).to.throw();
  });

  it('throws an error when defining a function that does not properly return on all paths - 1', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcFunDef({
      name: "bar",
      params: [{name: "sum", typ: "int"}, {name: "n", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {
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
        }
      ]
    }, env)).to.throw();
  });

  it('throws an error when defining a function that does not properly return on all paths - 2', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcFunDef({
      name: "bar",
      params: [{name: "sum", typ: "int"}, {name: "n", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {
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
        }
      ]
    }, env)).to.throw();
  });

  it('throws an error when defining a function that does not properly return on all paths - 3', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcFunDef({
      name: "bar",
      params: [{name: "sum", typ: "int"}, {name: "n", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {
          tag: "ifelse",
          ifcond: {tag: "literal", value: {tag: "true"}},
          ifbody: [
            {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
            {tag: "return", value: {tag: "id", name: "sum"}},
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
        }
      ]
    }, env)).to.throw();
  })

  it('typechecks defining a function that does not properly return on all paths with return type none', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    let ast = tcFunDef({
      name: "bar",
      params: [{name: "sum", typ: "int"}, {name: "n", typ: "int"}],
      ret: "none",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {
          tag: "ifelse",
          ifcond: {tag: "literal", value: {tag: "false"}},
          ifbody: [
            {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
          elifcond: {tag: "literal", value: {tag: "false"}},
          elifbody: [
            {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ]
        }
      ]
    }, env);

    expect(ast).to.deep.equal({
      name: "bar",
      params: [{name: "sum", typ: "int"}, {name: "n", typ: "int"}],
      ret: "none",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1, a: "int"}, a: "none"}, a: "none"},
      ],
      body: [
        {
          tag: "ifelse",
          ifcond: {tag: "literal", value: {tag: "false", a: "bool"}, a: "bool"},
          ifbody: [
            {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
            {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
          ],
          elifcond: {tag: "literal", value: {tag: "false", a: "bool"}, a: "bool"},
          elifbody: [
            {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
            {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
          ],
          a: "none",
        }
      ],
      a: "none",
    });
  });

  it('throws an error when defining a function with existing name', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcFunDef({
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {tag: "return", value: {tag: "id", name: "x"}}
      ]
    }, env)).to.throw();
  });

  it('throws an error when defining a function with duplicate parameter name', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "bar": {tag: "function", type: [[], "int"]}
      })), inFunc: false
    };

    expect(() => tcFunDef({
      name: "foo",
      params: [{name: "x", typ: "int"}, {name: "x", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {tag: "return", value: {tag: "id", name: "x"}}
      ]
    }, env)).to.throw();
  });

  it('throws an error when defining a function with wrong return expression type', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
      })), inFunc: false
    };

    expect(() => tcFunDef({
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: [
        {tag: "return", value: {tag: "literal", value: {tag: "false"}}}
      ]
    }, env)).to.throw();
  });

  it('typechecks expression statement', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
      })), inFunc: false
    };

    const ast = tcStmt({
      tag: "expr",
      expr: {tag: "literal", value: {tag: "number", value: 10}}
    }, env);

    expect(ast).to.deep.equal({
      tag: "expr",
      expr: {tag: "literal", value: {tag: "number", value: 10, a: "int"}, a: "int"},
      a: "none",
    });
  });

  it('typechecks while loop', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "x": {tag: "variable", type: "bool", global: true}
      })), inFunc: false
    };

    let ast = tcStmt({
      tag: "while",
      cond: {tag: "id", name: "x"},
      body: [
        {tag: "assign", name: "n", value: {tag: "literal", value: {tag: "number", value: 5}}},
        {tag: "expr", expr: {tag: "literal", value: {tag: "true"}}},
      ]
    }, env)

    expect(ast).to.deep.equal({
      tag: "while",
      cond: {tag: "id", name: "x", a: "bool"},
      body: [
        {tag: "assign", name: "n", value: {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"}, a: "none"},
        {tag: "expr", expr: {tag: "literal", value: {tag: "true", a: "bool"}, a: "bool"}, a: "none"},
      ],
      a: "none",
    });
  });

  it('typechecks if elif else ladder', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "sum": {tag: "variable", type: "int", global: true}
      })), inFunc: false
    };

    let ast = tcStmt({
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
    }, env);

    expect(ast).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true", a: "bool"}, a: "bool"},
      ifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      elifcond: {tag: "literal", value: {tag: "false", a: "bool"}, a: "bool"},
      elifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      elsebody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      a: "none",
    });
  });

  it('typechecks if statement', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "sum": {tag: "variable", type: "int", global: true}
      })), inFunc: false
    };

    let ast = tcStmt({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true"}},
      ifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    }, env);

    expect(ast).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true", a: "bool"}, a: "bool"},
      ifbody: [
        {tag: "assign", name: "sum", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", name: "n", value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      a: "none"
    });
  });

  it('typechecks program - 0', () => {
    const ast = tcProgram({
      defs: [
        {tag: "variable", def: {name: "x", type: "int", value: {tag: "number", value: 0}}},
        {
          tag: "function", def: {
            name: "inc", ret: "int", params: [], defs: [], body: [
              {tag: "return", value: {tag: "id", name: "x"}}
            ]
          }
        }
      ],
      stmts: []
    });

    expect(ast).to.deep.equal({
      defs: [
        {tag: "variable", def: {name: "x", type: "int", value: {tag: "number", value: 0, a: "int"}, a: "none"}, a: "none"},
        {
          tag: "function", def: {
            name: "inc", ret: "int", params: [], defs: [], body: [
              {tag: "return", value: {tag: "id", name: "x", a: "int"}, a: "none"}
            ],
            a: "none"
          },
          a: "none"
        }
      ],
      stmts: []
    });
  });

  it('typechecks program - 1', () => {
    expect(() => tcProgram({
      defs: [
        {tag: "variable", def: {name: "p", type: "bool", value: {tag: "true"}}},
        {
          tag: "function", def: {
            name: "f", ret: "int", params: [{name: "q", typ: "bool"}], defs: [], body: [
              {
                tag: "ifelse",
                ifcond: {tag: "binop", op: "<", lhs: {tag: "id", name: "q"}, rhs: {tag: "literal", value: {tag: "number", value: 25}}},
                ifbody: [{tag: "return", value: {tag: "literal", value: {tag: "number", value: 99}}}],
                elsebody: [{tag: "return", value: {tag: "literal", value: {tag: "number", value: 500}}}],
              }
            ]
          }
        },
      ],
      stmts: [
        {tag: "expr", expr: {tag: "call", name: "print", args: [{tag: "call", name: "f", args: [{tag: "id", name: "p"}]}]}},
        {tag: "expr", expr: {tag: "call", name: "print", args: [{tag: "call", name: "f", args: [{tag: "literal", value: {tag: "false"}}]}]}},
      ],
    })).to.throw();
  });
});
