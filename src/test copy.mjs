import fetch from 'node-fetch';

const a = 1;

const b = 2;

const C = 222;

console.log('dev run add', a, b, a + b);

const response = await fetch('https://github.com/');
const body = await response.text();

console.log(body);
