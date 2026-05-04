const sharp = require('sharp');

async function analyze() {
  const img = sharp('public/logo.png');
  const metadata = await img.metadata();
  console.log('Size:', metadata.width, metadata.height);
  
  // get some sample pixels
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  // check top left
  console.log('Top Left:', data[0], data[1], data[2], data[3]);
  // check center
  const cx = Math.floor(metadata.width / 2);
  const cy = Math.floor(metadata.height / 2);
  const cidx = (cy * metadata.width + cx) * metadata.channels;
  console.log('Center:', data[cidx], data[cidx+1], data[cidx+2], data[cidx+3]);
}

analyze().catch(console.error);
