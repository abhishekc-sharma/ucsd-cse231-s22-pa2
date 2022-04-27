export type Type =
  | "int"
  | "bool"
  | "none"
  | {tag: "object", name: string}

export type Program<A> = {defs: Def<A>[], stmts: Stmt<A>[]}

export type Parameter =
  | {name: string, typ: Type}

export type Literal<A> =
  | {a?: A, tag: "none"}
  | {a?: A, tag: "number", value: number}
  | {a?: A, tag: "bool"}
  | {a?: A, tag: "false"}
  | {a?: A, tag: "true"}

export type VarDef<A> = {a?: A, name: string, type: Type, value: Literal<A>}

export type FunDef<A> = {a?: A, name: string, params: Parameter[], ret: Type, defs: Def<A>[], body: Stmt<A>[]}

export type ClassDef<A> = {a?: A, name: string, parent: string, fields: VarDef<A>[], methods: FunDef<A>[]}

export type Def<A> =
  | {a?: A, tag: "variable", def: VarDef<A>}
  | {a?: A, tag: "function", def: FunDef<A>}
  | {a?: A, tag: "class", def: ClassDef<A>}

export type Stmt<A> =
  | {a?: A, tag: "pass"}
  | {a?: A, tag: "assign", name: string, value: Expr<A>}
  | {a?: A, tag: "expr", expr: Expr<A>}
  | {a?: A, tag: "return", value: Expr<A>}
  | {a?: A, tag: "while", cond: Expr<A>, body: Stmt<A>[]}
  | {a?: A, tag: "ifelse", ifcond: Expr<A>, ifbody: Stmt<A>[], elifcond?: Expr<A>, elifbody?: Stmt<A>[], elsebody?: Stmt<A>[]}

export type Expr<A> =
  | {a?: A, tag: "literal", value: Literal<A>}
  | {a?: A, tag: "unop", op: UnOp, expr: Expr<A>}
  | {a?: A, tag: "binop", op: BinOp, lhs: Expr<A>, rhs: Expr<A>}
  | {a?: A, tag: "id", name: string}
  | {a?: A, tag: "call", name: string, args: Expr<A>[]}

const unOps = {
  "-": true,
  "not": true,
};

export type UnOp = keyof (typeof unOps);
export function isUnOp(maybeUnOp: string): maybeUnOp is UnOp {
  return maybeUnOp in unOps;
}

const binOps = {
  "+": true,
  "-": true,
  "*": true,
  "//": true,
  "%": true,
  "==": true,
  "!=": true,
  "<=": true,
  ">=": true,
  "<": true,
  ">": true,
  "and": true,
  "or": true,
  "is": true,
};

export type BinOp = keyof (typeof binOps);
export function isBinOp(maybeBinOp: string): maybeBinOp is BinOp {
  return maybeBinOp in binOps;
}
