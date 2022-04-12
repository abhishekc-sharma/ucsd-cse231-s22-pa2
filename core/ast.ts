export type Type =
  | "int"
  | "bool"
  | "none"

export type Parameter =
  | { name: string, typ: Type }

export type Stmt<A> =
  | { a?: A, tag: "vardef", name: string, type: Type, value: Expr<A>, global: boolean }
  | { a?: A, tag: "assign", name: string, value: Expr<A> }
  | { a?: A, tag: "expr", expr: Expr<A> }
  | { a?: A, tag: "define", name: string, params: Parameter[], ret: Type, body: Stmt<A>[] }
  | { a?: A, tag: "return", value: Expr<A> }

export type Expr<A> = 
  | { a?: A, tag: "none" }
  | { a?: A, tag: "number", value: number }
  | { a?: A, tag: "true" }
  | { a?: A, tag: "false" }
  | { a?: A, tag: "unop", op: UnOp, expr: Expr<A> }
  | { a?: A, tag: "binop", op: BinOp, lhs: Expr<A>, rhs: Expr<A> }
  | { a?: A, tag: "id", name: string }
  | { a?: A, tag: "call", name: string, args: Expr<A>[] }

const unOps = {
  "-": true,
  "not": true,
};

export type UnOp = keyof (typeof unOps);
export function isUnOp(maybeUnOp : string) : maybeUnOp is UnOp {
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
export function isBinOp(maybeBinOp : string) : maybeBinOp is BinOp {
  return maybeBinOp in binOps;
}
