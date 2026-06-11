import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'public', 'models', 'gp53_blender.glb');
const buffer = fs.readFileSync(filePath);
const chunkLength = buffer.readUInt32LE(12);
const jsonStr = buffer.toString('utf8', 20, 20 + chunkLength);
const gltf = JSON.parse(jsonStr);

console.log("=== COMPREHENSIVE NODE HIERARCHY FOR BUTTONS ===");

function getParents(nodeIdx: number): any[] {
  const parents: any[] = [];
  let currentIdx = nodeIdx;
  while (true) {
    let found = false;
    for (let i = 0; i < gltf.nodes.length; i++) {
      const node = gltf.nodes[i];
      if (node.children && node.children.includes(currentIdx)) {
        parents.push({ idx: i, name: node.name, node });
        currentIdx = i;
        found = true;
        break;
      }
    }
    if (!found) break;
  }
  return parents;
}

const targetNames = ['button_triangle', 'button_square', 'button_circle', 'button_cross'];

gltf.nodes.forEach((node: any, idx: number) => {
  const name = node.name || '';
  if (targetNames.some(t => name.includes(t)) || /dpad/i.test(name)) {
    const parents = getParents(idx);
    console.log(`\nNode [${idx}]: name="${name}"`);
    console.log(`  self: translation=${JSON.stringify(node.translation)}, rotation=${JSON.stringify(node.rotation)}, scale=${JSON.stringify(node.scale)}`);
    parents.forEach(p => {
      console.log(`  parent [${p.idx}]: name="${p.name}", translation=${JSON.stringify(p.node.translation)}, rotation=${JSON.stringify(p.node.rotation)}, scale=${JSON.stringify(p.node.scale)}`);
    });
  }
});
