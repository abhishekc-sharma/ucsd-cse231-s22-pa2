import {expect} from 'chai'
import * as ast from '../core/ast'
import { tcExpr, tcStmt, tcProgram, TypingEnv, EnvType } from '../core/tc'

describe('tcExpr', () => {
  it('typechecks None literal', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };  
    let ast = tcExpr({tag: "none"}, env);
    expect(ast).to.deep.equal({tag: "none", a: "none"});
  });

  it('typechecks boolean literal True', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };
    let ast = tcExpr({tag: "true"}, env);
    expect(ast).to.deep.equal({tag: "true", a: "bool"});
  });

  it('typechecks boolean literal False', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };

    let ast = tcExpr({tag: "false"}, env);
    expect(ast).to.deep.equal({tag: "false", a: "bool"});
  });

  it('typechecks number literal', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };

    let ast = tcExpr({tag: "number", value: 10}, env);
    expect(ast).to.deep.equal({tag: "number", value: 10, a: "int"});
  });

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
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };

    let ast = tcExpr({tag: "call", name: "print", args: [{tag: "number", value: 10}]}, env);
    expect(ast).to.deep.equal({tag: "call", name: "print", args: [{tag: "number", value: 10, a: "int"}], a: "none"});
  });

  it('throws error on incorrect number of arguments to print builtin function', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };

    expect(() => tcExpr({tag: "call", name: "print", args: [{tag: "number", value: 10}, {tag: "true"}]}, env)).to.throw();
  });

  it('typechecks calls to functions with multiple arguments', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]}
      })),
      inFunc: false
    };

    let ast = tcExpr({tag: "call", name: "add_pred", args: [
      {tag: "number", value: 10},
      {tag: "number", value: 5}
    ]}, env);

    expect(ast).to.deep.equal({tag: "call", name: "add_pred", args: [
      {tag: "number", value: 10, a: "int"},
      {tag: "number", value: 5, a: "int"}
    ], a: "bool"});
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

    expect(() => tcExpr({tag: "call", name: "add_pred", args: [{tag: "number", value: 5}]}, env)).to.throw();
  });

  it('throws error on calls to variables as functions', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "foo": {tag: "variable", type: "int", global: true} 
      })),
      inFunc: false
    };

    expect(() => tcExpr({tag: "call", name: "foo", args: [{tag: "number", value: 5}]}, env)).to.throw();
  });

  it('throws error on calls to functions with incorrect argument type', () => {
    let env: TypingEnv = {
      ret: "none",
      vars: new Map<string, EnvType>(Object.entries({
        "add_pred": {tag: "function", type: [["int", "int"], "bool"]} 
      })),
      inFunc: false
    };

    expect(() => tcExpr({tag: "call", name: "add_pred", args: [{tag: "number", value: 5}, {tag: "true"}]}, env)).to.throw();
  });

  it('typechecks binary operator +', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };  

    let ast = tcExpr({
      tag: "binop",
      op: "+",
      lhs: {tag: "number", value: 5},
      rhs: {tag: "number", value: 10}
    }, env);

    expect(ast).to.deep.equal({
      tag: "binop",
      op: "+",
      lhs: {tag: "number", value: 5, a: "int"},
      rhs: {tag: "number", value: 10, a: "int"},
      a: "int"
    });
  });

  it('throws error on incorrect lhs type for binary operator +', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };  

    expect(() => tcExpr({
      tag: "binop",
      op: "+",
      lhs: {tag: "false"},
      rhs: {tag: "number", value: 10}
    }, env)).to.throw();
  });
  
  it('throws error on incorrect lhs type for binary operator +', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };  

    expect(() => tcExpr({
      tag: "binop",
      op: "+",
      lhs: {tag: "number", value: 10},
      rhs: {tag: "false"},
    }, env)).to.throw();
  });
});

describe('tcStmt', () => {
  it('typechecks global variable definition', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };  

    const ast = tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0},
      global: true,
    }, env);

    expect(ast).to.deep.equal({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0, a: "int"},
      global: true,
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: true});
  });

  it('typechecks local variable definition', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: true };  

    const ast = tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0},
      global: false,
    }, env);

    expect(ast).to.deep.equal({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0, a: "int"},
      global: false,
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: false});
  });

  it('typechecks local variable definition with shadowing global variable', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "bool", global: true} 
    })), inFunc: true };  

    const ast = tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0},
      global: false,
    }, env);

    expect(ast).to.deep.equal({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0, a: "int"},
      global: false,
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: false});
  });

  it('typechecks local variable definition with shadowing function definition', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "function", type: [[], "int"]} 
    })), inFunc: true };  

    const ast = tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0},
      global: false,
    }, env);

    expect(ast).to.deep.equal({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0, a: "int"},
      global: false,
    });

    expect(env.vars.get("x")).to.deep.equal({tag: "variable", type: "int", global: false});
  })

  it('throws error when global variable definition clashes with function definition', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "function", type: [[], "int"]} 
    })), inFunc: false };  

    expect(() => tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0},
      global: true,
    }, env)).to.throw();
  });

  it('throws error when global variable definition clashes with existing global variable', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "bool", global: true} 
    })), inFunc: false };  

    expect(() => tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0},
      global: true,
    }, env)).to.throw();
  });

  it('throws error when local variable definition clashes with existing local variable', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "bool", global: false} 
    })), inFunc: true };  

    expect(() => tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "number", value: 0},
      global: false,
    }, env)).to.throw();
  });

  it('throws error when variable definition is initialized with value of the wrong type', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
    })), inFunc: false };  

    expect(() => tcStmt({
      tag: "vardef",
      name: "x",
      type: "int",
      value: { tag: "true"},
      global: true,
    }, env)).to.throw();
  });

  it('typechecks global variable assignment', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "int", global: true} 
    })), inFunc: false };

    let ast = tcStmt({
      tag: "assign",
      name: "x",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "number", value: 1}}
    }, env)

    expect(ast).to.deep.equal({
      tag: "assign",
      name: "x",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "x", a: "int"}, rhs: {tag: "number", value: 1, a: "int"}, a: "int"}
    });
  });

  it('typechecks local variable assignment', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "int", global: false} 
    })), inFunc: true };

    let ast = tcStmt({
      tag: "assign",
      name: "x",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "number", value: 1}}
    }, env)

    expect(ast).to.deep.equal({
      tag: "assign",
      name: "x",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "x", a: "int"}, rhs: {tag: "number", value: 1, a: "int"}, a: "int"}
    });
  });

  it('errors on local assignment to global variable', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "int", global: true} 
    })), inFunc: true };

    expect(() => tcStmt({
      tag: "assign",
      name: "x",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "number", value: 1}}
    }, env)).to.throw();
  });

  it('errors on assignment to undefined variable', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "bool", global: true} 
    })), inFunc: false };

    expect(() => tcStmt({
      tag: "assign",
      name: "y",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "number", value: 1}}
    }, env)).to.throw();
  });

  it('errors on assignment with expression of the wrong type', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "variable", type: "bool", global: true},
      "y": {tag: "variable", type: "int", global: true} 
    })), inFunc: false };

    expect(() => tcStmt({
      tag: "assign",
      name: "x",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "y"}, rhs: {tag: "number", value: 1}}
    }, env)).to.throw();
  });

  it('errors on assignment to function', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "x": {tag: "function", type: [[], "int"]} 
    })), inFunc: false };

    expect(() => tcStmt({
      tag: "assign",
      name: "x",
      value: { tag: "binop", op: "+", lhs: {tag: "id", name: "x"}, rhs: {tag: "number", value: 1}}
    }, env)).to.throw();
  });

  it('typechecks function definition', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(), inFunc: false };  

    const ast = tcStmt({
      tag: "define",
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      body: [
        {tag: "vardef", name: "y", type: "int", value: {tag: "number", value: 1}, global: false},
        {tag: "return", value: {tag: "id", name: "x"}}
      ]
    }, env);

    expect(ast).to.deep.equal({
      tag: "define",
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      body: [
        {tag: "vardef", "name": "y", type: "int", value: {tag: "number", value: 1, a: "int"}, global: false},
        {tag: "return", value: {tag: "id", name: "x", a: "int"}}
      ]
    });

    expect(env.vars.get("foo")).to.deep.equal({tag: "function", type: [["int"], "int"]})
  });

  it('throws an error when defining a function with existing name', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
      "foo": {tag: "function", type: [[], "int"]} 
    })), inFunc: false };  

    expect(() => tcStmt({
      tag: "define",
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      body: [
        {tag: "vardef", name: "y", type: "int", value: {tag: "number", value: 1}, global: false},
        {tag: "return", value: {tag: "id", name: "x"}}
      ]
    }, env)).to.throw();
  });

  it('throws an error when defining a function with wrong return expression type', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
    })), inFunc: false };  

    expect(() => tcStmt({
      tag: "define",
      name: "foo",
      params: [{name: "x", typ: "int"}],
      ret: "int",
      body: [
        {tag: "vardef", name: "y", type: "int", value: {tag: "number", value: 1}, global: false},
        {tag: "return", value: {tag: "false"}}
      ]
    }, env)).to.throw();
  });

  it('typechecks expression statement', () => {
    let env: TypingEnv = { ret: "none", vars: new Map<string, EnvType>(Object.entries({
    })), inFunc: false };

    const ast = tcStmt({
      tag: "expr",
      expr: {tag: "number", value: 10}
    }, env);

    expect(ast).to.deep.equal({
      tag: "expr",
      expr: {tag: "number", value: 10, a: "int"}
    });
  });

  it('typechecks program - 0', () => {
    const ast = tcProgram([
      {tag: "vardef", name: "x", type: "int", value: {tag: "number", value: 0}, global: true}, 
      {tag: "define", name: "inc", ret: "int", params: [], body: [
        {tag: "return", value: {tag: "id", name: "x"}}
      ]}
    ]);

    expect(ast).to.deep.equal([
      {tag: "vardef", name: "x", type: "int", value: {tag: "number", value: 0, a: "int"}, global: true}, 
      {tag: "define", name: "inc", ret: "int", params: [], body: [
        {tag: "return", value: {tag: "id", name: "x", a: "int"}}
      ]}
    ]);
  });
});
