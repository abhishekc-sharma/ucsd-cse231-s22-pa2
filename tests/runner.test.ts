import { compile, run } from '../core/compiler';
import { expect } from 'chai';
import 'mocha';

function runTest(source : string) {
  return run(compile(source), importObject);
}

const importObject = {
  imports: {
    // we typically define print to mean logging to the console. To make testing
    // the compiler easier, we define print so it logs to a string object.
    //  We can then examine output to see what would have been printed in the
    //  console.
    print_num: (arg : any) => {
      importObject.output += arg;
      importObject.output += "\n";
      return arg;
    },
    print_bool: (arg : any) => {
      if(arg !== 0) { importObject.output += "True"; }
      else { importObject.output += "False"; }
      importObject.output += "\n";
    },
    print_none: (arg : any) => {
      importObject.output += "None";
      importObject.output += "\n";
    }
  },

  output: ""
};

// Clear the output before every test
beforeEach(function () {
  importObject.output = "";
});
  
// We write end-to-end tests here to make sure the compiler works as expected.
// You should write enough end-to-end tests until you are confident the compiler
// runs as expected. 
describe('run(source, config) function', () => {
  const config = { importObject };
  
  // We can test the behavior of the compiler in several ways:
  // 1- we can test the return value of a program
  // Note: since run is an async function, we use await to retrieve the 
  // asynchronous return value. 
  it('returns the right number', async () => {
    const result = await runTest("987");
    expect(result).to.equal(987);
  });

  // Note: it is often helpful to write tests for a functionality before you
  // implement it. You will make this test pass!
  it('adds two numbers', async() => {
    const result = await runTest("2 + 3");
    expect(result).to.equal(5);
  });

  it('prints a boolean', async() => {
    await runTest("print(True)");
    expect(importObject.output).to.equal("True\n");
  });

  it('defines and calls a function', async() => {
    await runTest("x: int = 2\ndef foo(n: int) -> int:\n\treturn n - x\nprint(foo(5))");
    expect(importObject.output).to.equal("3\n");
  });

  it('uses boolean operations', async() => {
    const result = await runTest("a: bool = True\nb: bool = False\na = a and True\na or b");
    expect(result).to.equal(1);
  });

  it('uses None literal', async() => {
    const result = await runTest("def foo(n: int):\n\treturn None\nprint(foo(5))");
    expect(importObject.output).to.equal("None\n");
    expect(result).to.equal(0);
  });

  it('uses unary negation operator', async() => {
    const result = await runTest(`-5`);
    expect(result).to.equal(-5);
  });

  it('uses unary not operator - 0', async() => {
    const result = await runTest(`not True`);
    expect(result).to.equal(0);
  });

  it('uses unary not operator - 1', async() => {
    const result = await runTest(`not False`);
    expect(result).to.equal(1);
  });

  it('uses is operator', async() => {
    const result = await runTest("def foo(n: int):\n\treturn None\nprint(foo(5) is None)");
    expect(importObject.output).to.equal("True\n");
  });

  it('uses binary operators - 0', async() => {
    const result = await runTest(`i1: int = 11\ni2: int = 4\ni3: int = 0\ni4: int = 0\nprint(i1 // i2)\nprint(i1 % i2)\nprint(i1 * i2)`);
    expect(importObject.output).to.equal("2\n3\n44\n");
  });

  it('uses binary operators - 1', async() => {
    const result = await runTest(`i1: int = 11\ni2: int = 4\ni3: int = 0\nprint(i1 >= 11)\nprint(i1 > 11)\nprint(i2 < 4)\nprint(i2 <= 4)`);
    expect(importObject.output).to.equal("True\nFalse\nFalse\nTrue\n");
  });

  it('uses binary operators - 2', async() => {
    const result = await runTest(`i1: int = 11\ni2: int = 4\ni3: int = 0\nprint(i1 == 11)\nprint(i1 != 11)\nprint(True == True)`);
    expect(importObject.output).to.equal("True\nFalse\nTrue\n");
  });

  it('uses a local variable in a function definition', async() => {
    const result = await runTest(`x: int = 5\ndef id(x: int) -> int:\n\treturn x\nprint(id(x))`);
    expect(importObject.output).to.equal("5\n");
  });

  it('runs pass statement', async () => {
    const result = await runTest("pass\n0");
    expect(result).to.equal(0);
  });

  it('runs if elif else ladder', async() => {
    const result = await runTest("a: int = 5\nif a > 5:\n\tprint(True)\nelif a == 5:\n\tprint(False)\nelse:\n\tprint(None)");
    expect(importObject.output).to.equal("False\n");
  });

  it('runs if elif ladder', async() => {
    const result = await runTest("a: int = 6\nif a > 5:\n\tprint(True)\nelif a == 5:\n\tprint(False)");
    expect(importObject.output).to.equal("True\n");
  });

  it('run function with early None return', async() => {
    const result = await runTest("def foo(n: int):\n\tif n < 5:\n\t\treturn\n\telse:\n\t\tprint(n)\na:int = 2\nfoo(a)");
    expect(importObject.output).to.equal("");
  });

  it('runs a program - 0', async() => {
    const result = await runTest("x: int = 5\ny: int = 3\ny = x + 1\nx = y + 1\nx");
    expect(result).to.equal(7);
  });

  it('runs a program - 1', async() => {
    const result = await runTest("a : int = 50\ndef f(b : int) -> int:\n\tif b < 25:\n\t\treturn b * 2\n\telse:\n\t\treturn b\nprint(f(a))\nprint(f(10))");
    expect(importObject.output).to.equal("50\n20\n");
  });

  it('runs a program - 2', async() => {
    const result = await runTest("def sum(n : int) -> int:\n\tif n < 1:return 0\n\telse: return sum(n - 1) + n\nsum(4)");
    expect(result).to.equal(10);
  });

  it('runs a program - 3', async() => {
    const result = await runTest("def sum(n : int) -> int:\n\ttotal : int = 0\n\twhile n > 0:\n\t\ttotal = total + n\n\t\tn = n - 1\n\treturn total\n\nsum(4)");
    expect(result).to.equal(10);
  });

  it('runs a program - 4', async() => {
    const result = await runTest("c : int = 10\nd : int = 100\nprint((c * 2) < (d + c))");
    expect(importObject.output).to.equal("True\n");
  });
});
