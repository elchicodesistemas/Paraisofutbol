// Generate simple code-native brand icons without external image dependencies.
import {deflateSync} from 'node:zlib';
import {writeFile} from 'node:fs/promises';
function crc32(buffer) { let crc=0xffffffff;for (const byte of buffer) {crc^=byte;for(let bit=0;bit<8;bit++) crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0; }
function chunk(type,data) { const name=Buffer.from(type);const result=Buffer.alloc(data.length+12);result.writeUInt32BE(data.length);name.copy(result,4);data.copy(result,8);result.writeUInt32BE(crc32(Buffer.concat([name,data])),data.length+8);return result; }
for(const size of [192,512]) {
  const pixels=Buffer.alloc((size*4+1)*size);
  for(let y=0;y<size;y++)for(let x=0;x<size;x++) {
    const nx=x/size,ny=y/size;
    const ink=ny>.28 && ny<.72 && ((nx>.28&&nx<.37)||(nx>.63&&nx<.72)||(nx>.34&&nx<.66&&Math.abs(ny-(nx*1.2-.1))<.07));
    const offset=y*(size*4+1)+1+x*4;pixels.set(ink?[201,250,117,255]:[21,45,37,255],offset);
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  await writeFile(new URL(`../public/icon-${size}.png`,import.meta.url),Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]));
}
