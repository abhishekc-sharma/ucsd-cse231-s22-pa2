import {compile, run} from '../core/compiler';

const importObject = {
  imports: {
    print_num: (arg : any) => {
      console.log(String(arg));
      return 0;
    },
    print_bool: (arg : any) => {
      if(arg === 0) { console.log("False"); }
      else { console.log("True"); }
      return 0;
    },
    print_none: (_arg: any) => {
      console.log("None");
      return 0;
    }
  },
};

// command to run:
// node node-main.js 987
const input = process.argv[2];
const result = compile(input);
console.log(result);
run(result, importObject).then((value) => {
  console.log(value);
});

