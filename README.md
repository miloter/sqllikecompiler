# Compiler of SQL queries that use the 'LIKE' clause.
Implementation of a text compiler to a format suitable for making SQL queries with the 'like' operator.

## Note:
sqllikecompiler is an ESM module so you will need to add to your package.json: "type": "module"

## Installation
```bash/powershell
npm install @miloter/sqllikecompiler
```

## Usage
```js
import SqlLikeCompiler from '@miloter/sqllikecompiler';

const comp = new SqlLikeCompiler('title');

console.log(comp.eval('vue javascript node'));
console.log(comp.eval('vue and react and node'));
console.log(comp.eval('(vue or react) and node'));
```
