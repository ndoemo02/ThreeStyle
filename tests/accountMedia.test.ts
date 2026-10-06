import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectAccountFile,accountObjectPath,DEFAULT_ACCOUNT_FILE_BYTES} from '../src/lib/accountMedia.ts';

test('cloud validation preserves display filename but generates a portable storage path',()=>{
  const file=inspectAccountFile({name:'Zażółć – mój utwór.MP3',size:8192});
  assert.equal(file.kind,'audio');assert.equal(file.mime_type,'audio/mpeg');assert.equal(file.title,'Zażółć – mój utwór');
  assert.equal(accountObjectPath('11111111-1111-4111-8111-111111111111','AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA',file.file_extension),'11111111-1111-4111-8111-111111111111/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/original.mp3');
});
test('validation rejects size spoofing, unsupported files and path injection before reservation',()=>{
  for(const size of [0,-1,NaN,Infinity,1.2,DEFAULT_ACCOUNT_FILE_BYTES+1])assert.throws(()=>inspectAccountFile({name:'a.mp3',size}));
  assert.throws(()=>inspectAccountFile({name:'a.exe',size:1}));
  assert.throws(()=>accountObjectPath('../someone','id','mp3'));
  assert.throws(()=>accountObjectPath('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','../mp3'));
});
