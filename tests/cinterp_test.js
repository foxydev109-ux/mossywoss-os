global.MWO = {};
const CInterp = require('./mw_web/cinterp.js');
const assert = require('assert');

console.log("=== Running Comprehensive CInterp Tests ===");

// 1. C for loop sum
const res1 = CInterp.run('int i; int s=0; for(i=1;i<=10;i++){s+=i;} printf("%d", s);', 'c', '');
console.log('Test 1 Output:', JSON.stringify(res1.output), 'ok:', res1.ok);
assert.strictEqual(res1.ok, true);
assert.strictEqual(res1.output, '55');

// 2. C recursion fibonacci
const res2 = CInterp.run('int fib(int n){ if(n<2) return n; return fib(n-1)+fib(n-2);} printf("%d", fib(15));', 'c', '');
console.log('Test 2 Output:', JSON.stringify(res2.output), 'ok:', res2.ok);
assert.strictEqual(res2.ok, true);
assert.strictEqual(res2.output, '610');

// 3. C++ array and cout
const res3 = CInterp.run('int a[5]; int i; for(i=0;i<5;i++) a[i]=i*i; for(i=0;i<5;i++) cout << a[i] << " ";', 'cpp', '');
console.log('Test 3 Output:', JSON.stringify(res3.output), 'ok:', res3.ok);
assert.strictEqual(res3.ok, true);
assert.strictEqual(res3.output, '0 1 4 9 16 ');

// 4. C# string interpolation and Console.WriteLine
const res4 = CInterp.run('int x=7; int y=6; Console.WriteLine($"{x} times {y} is {x*y}");', 'csharp', '');
console.log('Test 4 Output:', JSON.stringify(res4.output.trim()), 'ok:', res4.ok);
assert.strictEqual(res4.ok, true);
assert.strictEqual(res4.output.trim(), '7 times 6 is 42');

// 5. printf width and precision
const res5 = CInterp.run('printf("%5.2f", 3.14159);', 'c', '');
console.log('Test 5 Output:', JSON.stringify(res5.output), 'ok:', res5.ok);
assert.strictEqual(res5.ok, true);
assert.strictEqual(res5.output, ' 3.14');

// 6. Runtime error: division by zero
const res6 = CInterp.run('int x = 10 / 0;', 'c', '');
console.log('Test 6 Errors:', res6.errors, 'ok:', res6.ok);
assert.strictEqual(res6.ok, false);
assert(res6.errors[0].includes('Runtime error'));

// 7. scanf from stdin '10' -> doubles it -> '20'
const res7 = CInterp.run('int x; scanf("%d", &x); printf("%d", x * 2);', 'c', '10');
console.log('Test 7 Output:', JSON.stringify(res7.output), 'ok:', res7.ok);
assert.strictEqual(res7.ok, true);
assert.strictEqual(res7.output, '20');

// 8. 2D array
const res8 = CInterp.run('int m[2][2] = {{1, 2}, {3, 4}}; printf("%d", m[1][0]);', 'c', '');
console.log('Test 8 Output:', JSON.stringify(res8.output), 'ok:', res8.ok);
assert.strictEqual(res8.ok, true);
assert.strictEqual(res8.output, '3');

// 9. Struct fields
const res9 = CInterp.run('struct Point { int x; int y; }; struct Point p; p.x = 42; printf("%d", p.x);', 'c', '');
console.log('Test 9 Output:', JSON.stringify(res9.output), 'ok:', res9.ok);
assert.strictEqual(res9.ok, true);
assert.strictEqual(res9.output, '42');

// 10. Pointer error
const res10 = CInterp.run('int* p;', 'c', '');
console.log('Test 10 Errors:', res10.errors, 'ok:', res10.ok);
assert.strictEqual(res10.ok, false);
assert(res10.errors[0].includes('Pointers not supported'));

// 11. C# Math
const res11 = CInterp.run('Console.WriteLine(Math.Sqrt(16));', 'csharp', '');
console.log('Test 11 Output:', JSON.stringify(res11.output.trim()), 'ok:', res11.ok);
assert.strictEqual(res11.ok, true);
assert.strictEqual(res11.output.trim(), '4');

console.log("\nALL 11 TESTS PASSED SUCCESSFULLY! ✅");
