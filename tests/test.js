import SqlLikeCompiler from '../sql-like-compiler.js';

const comp = new SqlLikeCompiler('title');

console.log(comp.eval('vue javascript node'));
console.log(comp.eval('vue and react and node'));
console.log(comp.eval('(vue or react) and node'));