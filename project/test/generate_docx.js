import fs from 'fs';
import zlib from 'zlib';

// Minimal DOCX zip builder
function createMinimalDocx(text) {
  // We can write a script using zip compression or test docx
  // Let's create the XML structure for word/document.xml
  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</w:t></w:r></w:p>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // Helper to build a valid uncompressed / deflate zip file
  function buildZip(files) {
    const localHeaders = [];
    const centralDirs = [];
    let offset = 0;

    for (const file of files) {
      const nameBuf = Buffer.from(file.name, 'utf8');
      const dataBuf = Buffer.from(file.content, 'utf8');
      const crc = crc32(dataBuf);
      const size = dataBuf.length;

      // Local file header (30 bytes + filename length)
      const localHeader = Buffer.alloc(30 + nameBuf.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // signature
      localHeader.writeUInt16LE(20, 4); // version needed
      localHeader.writeUInt16LE(0, 6); // flags
      localHeader.writeUInt16LE(0, 8); // compression (0 = stored)
      localHeader.writeUInt16LE(0, 10); // mod time
      localHeader.writeUInt16LE(0, 12); // mod date
      localHeader.writeUInt32LE(crc, 14); // crc-32
      localHeader.writeUInt32LE(size, 18); // compressed size
      localHeader.writeUInt32LE(size, 22); // uncompressed size
      localHeader.writeUInt16LE(nameBuf.length, 26); // filename length
      localHeader.writeUInt16LE(0, 28); // extra field length
      nameBuf.copy(localHeader, 30);

      // Central directory header (46 bytes + filename length)
      const cdHeader = Buffer.alloc(46 + nameBuf.length);
      cdHeader.writeUInt32LE(0x02014b50, 0); // signature
      cdHeader.writeUInt16LE(20, 4); // version made by
      cdHeader.writeUInt16LE(20, 6); // version needed
      cdHeader.writeUInt16LE(0, 8); // flags
      cdHeader.writeUInt16LE(0, 10); // compression
      cdHeader.writeUInt16LE(0, 12); // mod time
      cdHeader.writeUInt16LE(0, 14); // mod date
      cdHeader.writeUInt32LE(crc, 16); // crc-32
      cdHeader.writeUInt32LE(size, 20); // compressed size
      cdHeader.writeUInt32LE(size, 24); // uncompressed size
      cdHeader.writeUInt16LE(nameBuf.length, 28); // filename length
      cdHeader.writeUInt16LE(0, 30); // extra field length
      cdHeader.writeUInt16LE(0, 32); // comment length
      cdHeader.writeUInt16LE(0, 34); // disk number start
      cdHeader.writeUInt16LE(0, 36); // internal file attributes
      cdHeader.writeUInt32LE(0, 38); // external file attributes
      cdHeader.writeUInt32LE(offset, 42); // relative offset of local header
      nameBuf.copy(cdHeader, 46);

      localHeaders.push(localHeader, dataBuf);
      centralDirs.push(cdHeader);

      offset += localHeader.length + dataBuf.length;
    }

    const cdOffset = offset;
    const cdSize = centralDirs.reduce((acc, b) => acc + b.length, 0);

    // End of central directory record (22 bytes)
    const eocd = Buffer.alloc(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk number with start of CD
    eocd.writeUInt16LE(files.length, 8); // total entries on disk
    eocd.writeUInt16LE(files.length, 10); // total entries
    eocd.writeUInt32LE(cdSize, 12); // size of central directory
    eocd.writeUInt32LE(cdOffset, 16); // offset of start of central directory
    eocd.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([...localHeaders, ...centralDirs, eocd]);
  }

  function crc32(buf) {
    let crc = ~0;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (~crc) >>> 0;
  }

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }

  const files = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'word/document.xml', content: docXml }
  ];

  return buildZip(files);
}

const docxBuf = createMinimalDocx('ALEX RIVERA - Staff Distributed Systems Engineer. Experienced in Raft consensus and Kubernetes operator design.');
fs.writeFileSync('/Users/devikaanup/Desktop/promptwars/project/test/fixtures/sample_resume.docx', docxBuf);
console.log('Created sample_resume.docx successfully, size:', docxBuf.length);
