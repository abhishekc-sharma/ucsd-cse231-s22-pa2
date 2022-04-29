import {expect} from 'chai'
import * as ast from '../core/ast'
import {tcLiteral, tcExpr, tcStmt, tcVarDef, tcFunDef, tcProgram, TypingEnv, EnvType, ClassType} from '../core/tc'

describe('tcLiteral', () => {
  it('typechecks None literal', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};
    let ast = tcLiteral({tag: "none"}, env);
    expect(ast).to.deep.equal({tag: "none", a: "none"});
  });

  it('typechecks boolean literal True', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};
    let ast = tcLiteral({tag: "true"}, env);
    expect(ast).to.deep.equal({tag: "true", a: "bool"});
  });

  it('typechecks boolean literal False', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    let ast = tcLiteral({tag: "false"}, env);
    expect(ast).to.deep.equal({tag: "false", a: "bool"});
  });

  it('typechecks number literal', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcExpr({tag: "id", name: "y"}, env)).to.throw();
  });

  it('throws error on function used as a variable', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "function", type: [["int"], "int"]}
      })),
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcExpr({tag: "id", name: "x"}, env)).to.throw();
  });

  it('typechecks field access expression', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: "int",
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    let ast = tcExpr({
      tag: "field",
      obj: {tag: "id", name: "p"},
      name: "y",
    }, env);

    expect(ast).to.deep.equal({
      tag: "field",
      obj: {tag: "id", name: "p", a: {tag: "object", name: "Point"}},
      name: "y",
      a: "int"
    });
  });

  it('typechecks nested field access expression', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    let ast = tcExpr({
      tag: "field",
      obj: {tag: "field", obj: {tag: "id", name: "p"}, name: "x"},
      name: "y",
    }, env);

    expect(ast).to.deep.equal({
      tag: "field",
      obj: {tag: "field", obj: {tag: "id", name: "p", a: {tag: "object", name: "Point"}}, name: "x", a: {tag: "object", name: "Point"}},
      name: "y",
      a: "int"
    });
  });

  it('throws an error on accessing an invalid field', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "field",
      obj: {tag: "field", obj: {tag: "id", name: "p"}, name: "x"},
      name: "z",
    }, env)).to.throw();
  });

  it('throws an error on accessing a field of non-object type', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: "int", global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "field",
      obj: {tag: "field", obj: {tag: "id", name: "p"}, name: "x"},
      name: "y",
    }, env)).to.throw();
  })

  it('typechecks calls to the print builtin function', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    let ast = tcExpr({tag: "call", name: "print", args: [{tag: "literal", value: {tag: "number", value: 10}}]}, env);
    expect(ast).to.deep.equal({tag: "call", name: "print", args: [{tag: "literal", value: {tag: "number", value: 10, a: "int"}, a: "int"}], a: "none"});
  });

  it('throws error on incorrect number of arguments to print builtin function', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    expect(() => tcExpr({tag: "call", name: "print", args: [{tag: "literal", value: {tag: "number", value: 10}}, {tag: "literal", value: {tag: "true"}}]}, env)).to.throw();
  });

  it('typechecks calls to functions with multiple arguments', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]}
      })),
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    let ast = tcExpr({tag: "call", name: "add_pred", args: []}, env);

    expect(ast).to.deep.equal({tag: "call", name: "add_pred", args: [], a: "bool"});
  });

  it('throws error on calls to undefined functions', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(),
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcExpr({tag: "call", name: "add_pred", args: []}, env)).to.throw();
  });

  it('throws error on calls to functions with incorrect number of arguments', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]}
      })),
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcExpr({tag: "call", name: "add_pred", args: [{tag: "literal", value: {tag: "number", value: 5}}]}, env)).to.throw();
  });

  it('throws error on calls to variables as functions', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "variable", type: "int", global: true}
      })),
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcExpr({tag: "call", name: "foo", args: [{tag: "literal", value: {tag: "number", value: 5}}]}, env)).to.throw();
  });

  it('throws error on calls to functions with incorrect argument type', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]}
      })),
      inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcExpr({tag: "call", name: "add_pred", args: [{tag: "literal", value: {tag: "number", value: 5}}, {tag: "literal", value: {tag: "true"}}]}, env)).to.throw();
  });

  it('typechecks calls to class construction', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: "int",
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    let ast = tcExpr({
      tag: "call",
      name: "Point",
      args: [],
    }, env);

    expect(ast).to.deep.equal({
      tag: "call",
      name: "Point",
      args: [],
      a: {tag: "object", name: "Point"},
    });
  });

  it('throws an error on class construction of invalid class', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: "int",
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "call",
      name: "Pointy",
      args: [],
    }, env)).to.throw();
  });

  it('throws an error on class construction with arguments', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: "int",
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "call",
      name: "Point",
      args: [{tag: "literal", value: {tag: "false"}}],
    }, env)).to.throw();
  });

  it('typechecks method calls on objects', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(Object.entries({
            "new": [["int", "int"], "none"]
          })),
        }
      })),
      inFunc: false,
    };

    let ast = tcExpr({
      tag: "method",
      obj: {tag: "id", name: "p"},
      name: "new",
      args: [{tag: "literal", value: {tag: "number", value: 5}}, {tag: "literal", value: {tag: "number", value: 5}}]
    }, env);

    expect(ast).to.deep.equal({
      tag: "method",
      obj: {tag: "id", name: "p", a: {tag: "object", name: "Point"}},
      name: "new",
      args: [{tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"}, {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"}],
      a: "none",
    });
  });

  it('throws error on invalid method call on object', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(Object.entries({
            "new": [["int", "int"], "none"]
          })),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "method",
      obj: {tag: "id", name: "p"},
      name: "foo",
      args: [{tag: "literal", value: {tag: "number", value: 5}}, {tag: "literal", value: {tag: "number", value: 5}}]
    }, env)).to.throw()
  });

  it('throws error on method call on non object type', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: "int", global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(Object.entries({
            "new": [["int", "int"], "none"]
          })),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "method",
      obj: {tag: "id", name: "p"},
      name: "new",
      args: [{tag: "literal", value: {tag: "number", value: 5}}, {tag: "literal", value: {tag: "number", value: 5}}]
    }, env)).to.throw()
  });

  it('throws error on incorrect type of arguments to method', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(Object.entries({
            "new": [["int", "int"], "none"]
          })),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "method",
      obj: {tag: "id", name: "p"},
      name: "new",
      args: [{tag: "literal", value: {tag: "false"}}, {tag: "literal", value: {tag: "number", value: 5}}]
    }, env)).to.throw();
  });

  it('throws error on incorrect number of arguments to method', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(Object.entries({
            "new": [["int", "int"], "none"]
          })),
        }
      })),
      inFunc: false,
    };

    expect(() => tcExpr({
      tag: "method",
      obj: {tag: "id", name: "p"},
      name: "new",
      args: [{tag: "literal", value: {tag: "number", value: 5}}]
    }, env)).to.throw();
  });

  it('typechecks unary operator -', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    expect(() => tcExpr({
      tag: "unop",
      op: "-",
      expr: {tag: "literal", value: {tag: "true"}},
    }, env)).to.throw();
  });

  it('typechecks binary operator +', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    expect(() => tcExpr({
      tag: "binop",
      op: "+",
      lhs: {tag: "literal", value: {tag: "false"}},
      rhs: {tag: "literal", value: {tag: "number", value: 10}}
    }, env)).to.throw();
  });

  it('throws error on incorrect lhs type for binary operator +', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    const ast = tcStmt({
      tag: "pass",
    }, env);

    expect(ast).to.deep.equal({tag: "pass", a: "none"});
  });

  it('typechecks global variable definition', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: true, classNames: new Set(), classes: new Map<string, ClassType>()};

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
      })), inFunc: true, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: true, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcVarDef({
      name: "x",
      type: "int",
      value: {tag: "number", value: 0},
    }, env)).to.throw();
  });

  it('throws error when global variable definition has invalid type annotation', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcVarDef({
      name: "x",
      type: {tag: "object", name: "Foo"},
      value: {tag: "number", value: 0},
    }, env)).to.throw();
  });

  it('throws error when global variable definition clashes with existing global variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: true, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    let ast = tcStmt({
      tag: "assign",
      lhs: {tag: "variable", name: "x"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)

    expect(ast).to.deep.equal({
      tag: "assign",
      lhs: {tag: "variable", name: "x", a: "int"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"},
      a: "none"
    });
  });

  it('typechecks local variable assignment', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "int", global: false}
      })), inFunc: true, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    let ast = tcStmt({
      tag: "assign",
      lhs: {tag: "variable", name: "x"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)

    expect(ast).to.deep.equal({
      tag: "assign",
      lhs: {tag: "variable", name: "x", a: "int"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"},
      a: "none"
    });
  });

  it('errors on local assignment to global variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "int", global: true}
      })), inFunc: true, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcStmt({
      tag: "assign",
      lhs: {tag: "variable", name: "x"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('errors on assignment to undefined variable', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcStmt({
      tag: "assign",
      lhs: {tag: "variable", name: "y"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('errors on assignment with expression of the wrong type', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "variable", type: "bool", global: true},
        "y": {tag: "variable", type: "int", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcStmt({
      tag: "assign",
      lhs: {tag: "variable", name: "x"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "y"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('errors on assignment to function', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "x": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcStmt({
      tag: "assign",
      lhs: {tag: "variable", name: "x"},
      value: {tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}
    }, env)).to.throw();
  });

  it('typechecks assignment to object field', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: "int",
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    let ast = tcStmt({
      tag: "assign",
      lhs: {tag: "member", expr: {tag: "id", name: "p"}, name: "x"},
      value: {tag: "literal", value: {tag: "number", value: 5}}
    }, env);

    expect(ast).to.deep.equal({
      tag: "assign",
      lhs: {tag: "member", expr: {tag: "id", name: "p", a: {tag: "object", name: "Point"}}, name: "x", a: "int"},
      value: {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"},
      a: "none"
    });
  });

  it('typechecks assignment to nested object field', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: {tag: "object", name: "Point"},
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    let ast = tcStmt({
      tag: "assign",
      lhs: {tag: "member", expr: {tag: "field", obj: {tag: "id", name: "p"}, name: "x"}, name: "y"},
      value: {tag: "literal", value: {tag: "number", value: 5}}
    }, env);

    expect(ast).to.deep.equal({
      tag: "assign",
      lhs: {tag: "member", expr: {tag: "field", obj: {tag: "id", name: "p", a: {tag: "object", name: "Point"}}, name: "x", a: {tag: "object", name: "Point"}}, name: "y", a: "int"},
      value: {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"},
      a: "none"
    });
  });

  it('throws error on assignment to invalid object field', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: {tag: "object", name: "Point"}, global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: "int",
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    expect(() => tcStmt({
      tag: "assign",
      lhs: {tag: "member", expr: {tag: "id", name: "p"}, name: "z"},
      value: {tag: "literal", value: {tag: "number", value: 5}}
    }, env)).to.throw();
  });

  it('throws error on assignment to field on invalid non-object type', () => {
    let env: TypingEnv = {
      ret: "none",
      classNames: new Set(["object", "Point"]),
      vars: new Map<string, EnvType>(Object.entries({
        "p": {
          tag: "variable", type: "int", global: true
        }
      })),
      classes: new Map<string, ClassType>(Object.entries({
        "Point": {
          fields: new Map<string, ast.Type>(Object.entries({
            x: "int",
            y: "int",
          })),
          methods: new Map<string, [ast.Type[], ast.Type]>(),
        }
      })),
      inFunc: false,
    };

    expect(() => tcStmt({
      tag: "assign",
      lhs: {tag: "member", expr: {tag: "id", name: "p"}, name: "z"},
      value: {tag: "literal", value: {tag: "number", value: 5}}
    }, env)).to.throw();
  });

  it('typechecks function definition', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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

    //expect(env.vars.get("foo")).to.deep.equal({tag: "function", type: [["int"], "int"]})
  });

  it('typechecks function definition with none return type', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

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

    //expect(env.vars.get("foo")).to.deep.equal({tag: "function", type: [["int"], "none"]})
  });

  it('throws an error when function has invalid return type', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    expect(() => tcFunDef({
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: {tag: "object", name: "Foo"},
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: []
    }, env)).to.throw();
  });

  it('throws an error when function has parameter with invalid type', () => {
    let env: TypingEnv = {ret: "none", vars: new Map<string, EnvType>(), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()};

    expect(() => tcFunDef({
      name: "foo",
      params: [{name: "x", typ: {tag: "object", name: "Foo"}}],
      ret: "none",
      defs: [
        {tag: "variable", def: {name: "y", type: "int", value: {tag: "number", value: 1}}},
      ],
      body: []
    }, env)).to.throw();
  });

  it('throws an error when defining a function that does not return on all paths - 0', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
          elifcond: {tag: "literal", value: {tag: "false"}},
          elifbody: [
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
          elsebody: [
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
        }
      ]
    }, env)).to.throw();
  });

  it('throws an error when defining a function that does not properly return on all paths - 2', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
          elifcond: {tag: "literal", value: {tag: "false"}},
          elifbody: [
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
        }
      ]
    }, env)).to.throw();
  });

  it('throws an error when defining a function that does not properly return on all paths - 3', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
            {tag: "return", value: {tag: "id", name: "sum"}},
          ],
          elifcond: {tag: "literal", value: {tag: "false"}},
          elifbody: [
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
          elsebody: [
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
        }
      ]
    }, env)).to.throw();
  })

  it('typechecks defining a function that does not properly return on all paths with return type none', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
          ],
          elifcond: {tag: "literal", value: {tag: "false"}},
          elifbody: [
            {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
            {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
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
            {tag: "assign", lhs: {tag: "variable", name: "sum", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
            {tag: "assign", lhs: {tag: "variable", name: "n", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
          ],
          elifcond: {tag: "literal", value: {tag: "false", a: "bool"}, a: "bool"},
          elifbody: [
            {tag: "assign", lhs: {tag: "variable", name: "sum", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
            {tag: "assign", lhs: {tag: "variable", name: "n", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
          ],
          a: "none",
        }
      ],
      a: "none",
    });
  });

  /*it('throws an error when defining a function with existing name', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
  });*/

  it('throws an error when defining a function with duplicate parameter name', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "bar": {tag: "function", type: [[], "int"]}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
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
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    let ast = tcStmt({
      tag: "while",
      cond: {tag: "id", name: "x"},
      body: [
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "literal", value: {tag: "number", value: 5}}},
        {tag: "expr", expr: {tag: "literal", value: {tag: "true"}}},
      ]
    }, env);

    expect(ast).to.deep.equal({
      tag: "while",
      cond: {tag: "id", name: "x", a: "bool"},
      body: [
        {tag: "assign", lhs: {tag: "variable", name: "n", a: "int"}, value: {tag: "literal", value: {tag: "number", value: 5, a: "int"}, a: "int"}, a: "none"},
        {tag: "expr", expr: {tag: "literal", value: {tag: "true", a: "bool"}, a: "bool"}, a: "none"},
      ],
      a: "none",
    });
  });

  it('throws an error when a while loop condition is not boolean', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "x": {tag: "variable", type: "bool", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcStmt({
      tag: "while",
      cond: {tag: "id", name: "n"},
      body: [
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "literal", value: {tag: "number", value: 5}}},
        {tag: "expr", expr: {tag: "literal", value: {tag: "true"}}},
      ]
    }, env)).to.throw();
  });

  it('typechecks if elif else ladder', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "sum": {tag: "variable", type: "int", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    let ast = tcStmt({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true"}},
      ifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elifcond: {tag: "literal", value: {tag: "false"}},
      elifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elsebody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    }, env);

    expect(ast).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true", a: "bool"}, a: "bool"},
      ifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", lhs: {tag: "variable", name: "n", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      elifcond: {tag: "literal", value: {tag: "false", a: "bool"}, a: "bool"},
      elifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", lhs: {tag: "variable", name: "n", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      elsebody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", lhs: {tag: "variable", name: "n", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      a: "none",
    });
  });

  it('typechecks if statement', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "sum": {tag: "variable", type: "int", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    let ast = tcStmt({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true"}},
      ifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    }, env);

    expect(ast).to.deep.equal({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "true", a: "bool"}, a: "bool"},
      ifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum", a: "int"}, rhs: {tag: "id", name: "n", a: "int"}, a: "int"}, a: "none"},
        {tag: "assign", lhs: {tag: "variable", name: "n", a: "int"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n", a: "int"}, rhs: {tag: "literal", value: {tag: "number", value: 1, a: "int"}, a: "int"}, a: "int"}, a: "none"},
      ],
      a: "none"
    });
  });

  it('throws an error when if condition is not boolean', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "sum": {tag: "variable", type: "int", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcStmt({
      tag: "ifelse",
      ifcond: {tag: "id", name: "n"},
      ifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elifcond: {tag: "literal", value: {tag: "false"}},
      elifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elsebody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    }, env)).to.throw();
  });

  it('throws an error when elif condition is not boolean', () => {
    let env: TypingEnv = {
      ret: "none", vars: new Map<string, EnvType>(Object.entries({
        "n": {tag: "variable", type: "int", global: true},
        "sum": {tag: "variable", type: "int", global: true}
      })), inFunc: false, classNames: new Set(), classes: new Map<string, ClassType>()
    };

    expect(() => tcStmt({
      tag: "ifelse",
      ifcond: {tag: "literal", value: {tag: "false"}},
      ifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elifcond: {tag: "id", name: "n"},
      elifbody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
      elsebody: [
        {tag: "assign", lhs: {tag: "variable", name: "sum"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "sum"}, rhs: {tag: "id", name: "n"}}},
        {tag: "assign", lhs: {tag: "variable", name: "n"}, value: {tag: "binop", op: "+", lhs: {tag: "id", name: "n"}, rhs: {tag: "literal", value: {tag: "number", value: 1}}}},
      ],
    }, env)).to.throw();
  })

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

  it('typechecks program with a class definition with fields', () => {
    const ast = tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "int", value: {tag: "number", value: 456}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [],
          }
        }
      ],
      stmts: [],
    });

    expect(ast).to.deep.equal({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "int", value: {tag: "number", value: 456, a: "int"}, a: "none"},
              {name: "d", type: "int", value: {tag: "number", value: 789, a: "int"}, a: "none"},
            ],
            methods: [],
            a: "none",
          },
          a: "none",
        }
      ],
      stmts: [],
    });
  });

  it('typechecks program with a class definition with fields and methods', () => {
    const ast = tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "int", value: {tag: "number", value: 456}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    });

    expect(ast).to.deep.equal({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "int", value: {tag: "number", value: 456, a: "int"}, a: "none"},
              {name: "d", type: "int", value: {tag: "number", value: 789, a: "int"}, a: "none"},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass", a: "none"}],
                a: "none",
              }
            ],
            a: "none",
          },
          a: "none"
        },
      ],
      stmts: [],
    });
  });

  it('throws an error when field has invalid type annotation', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: {tag: "object", name: "Foo"}, value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when field is assigned value of incorrect type', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "int", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when two fields have same name', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "n", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when first parameter to method does not have class type - 0', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Foo"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when first parameter to method does not have class type - 1', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when first parameter to method does not have class type - 2', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: "int"}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when method name overlaps with a field name', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [{
              name: "d",
              params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
              ret: "none",
              defs: [],
              body: [{tag: "pass"}]
            }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when class has invalid parent class - 0', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "Mouse",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "db",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when class has invalid parent class - 1', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "Rat",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "db",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  })

  it('throws an error when method name overlaps with another method name', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "m1",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              },
              {
                name: "m1",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        }
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when a global variable clashes with a class name', () => {
    expect(() => tcProgram({
      defs: [
        {tag: "variable", def: {name: "Rat", type: "bool", value: {tag: "false"}}},
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        },
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when a local variable tries to shadow class name', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "function",
          def: {
            name: "foo",
            ret: "none",
            params: [],
            defs: [{
              tag: "variable",
              def: {
                name: "Rat",
                type: "bool",
                value: {tag: "false"}
              }
            }],
            body: []
          }
        },
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        },
      ],
      stmts: [],
    })).to.throw();
  });

  it('throws an error when a function definition clashes with a class name', () => {
    expect(() => tcProgram({
      defs: [
        {
          tag: "function",
          def: {
            name: "Rat",
            ret: "none",
            params: [],
            defs: [{
              tag: "variable",
              def: {
                name: "m",
                type: "bool",
                value: {tag: "false"}
              }
            }],
            body: []
          }
        },
        {
          tag: "class",
          def: {
            name: "Rat",
            parent: "object",
            fields: [
              {name: "n", type: "bool", value: {tag: "true"}},
              {name: "d", type: "int", value: {tag: "number", value: 789}},
            ],
            methods: [
              {
                name: "__init__",
                params: [{name: "self", typ: {tag: "object", name: "Rat"}}],
                ret: "none",
                defs: [],
                body: [{tag: "pass"}]
              }
            ],
          }
        },
      ],
      stmts: [],
    })).to.throw();
  });
});
