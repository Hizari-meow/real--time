import fs from 'fs';
import path from 'path';

interface Graph {
  [file: string]: string[];
}

function getFiles(dir: string, ext = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(filePath, ext));
    } else {
      if (ext.includes(path.extname(filePath))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

function resolveImport(sourceFile: string, importPath: string, rootDir: string): string | null {
  // Ignore external libraries
  if (!importPath.startsWith('.') && !importPath.startsWith('@/')) {
    return null;
  }

  let resolved = '';
  if (importPath.startsWith('@/')) {
    resolved = path.join(rootDir, importPath.slice(2));
  } else {
    resolved = path.resolve(path.dirname(sourceFile), importPath);
  }

  // Handle extensions / index
  const candidates = [
    resolved,
    resolved + '.ts',
    resolved + '.tsx',
    resolved + '.js',
    resolved + '.jsx',
    resolved.replace(/\.js$/, '.ts'),
    path.join(resolved, 'index.ts'),
    path.join(resolved, 'index.tsx'),
    path.join(resolved, 'index.js'),
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return cand;
    }
  }

  return null;
}

function buildGraph(srcDir: string, rootDir: string): Graph {
  const files = getFiles(srcDir);
  const graph: Graph = {};

  const importRegex = /(?:import|export)\s+(?:(?:(?:\*\s+as\s+\w+)|(?:[\w\s{},*]+))\s+from\s+)?['"]([^'"]+)['"]/g;

  for (const file of files) {
    graph[file] = [];
    const content = fs.readFileSync(file, 'utf-8');
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolved = resolveImport(file, importPath, rootDir);
      if (resolved && resolved.startsWith(srcDir)) {
        if (!graph[file].includes(resolved)) {
          graph[file].push(resolved);
        }
      }
    }
  }

  return graph;
}

function findCycles(graph: Graph): string[][] {
  const visited = new Set<string>();
  const recStack = new Set<string>();
  const cycles: string[][] = [];

  function dfs(node: string, currentPath: string[]) {
    visited.add(node);
    recStack.add(node);
    currentPath.push(node);

    const neighbors = graph[node] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, currentPath);
      } else if (recStack.has(neighbor)) {
        const cycleStartIndex = currentPath.indexOf(neighbor);
        cycles.push(currentPath.slice(cycleStartIndex).concat(neighbor));
      }
    }

    currentPath.pop();
    recStack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

console.log('--- Checking circular dependencies in packages/server/src ---');
const serverSrc = path.resolve('packages/server/src');
const serverGraph = buildGraph(serverSrc, serverSrc);
const serverCycles = findCycles(serverGraph);
console.log(`Server cycles found: ${serverCycles.length}`);
if (serverCycles.length > 0) {
  serverCycles.forEach((c, i) => {
    console.log(`Cycle ${i + 1}:`, c.map((p) => path.relative(serverSrc, p)).join(' -> '));
  });
}

console.log('\n--- Checking circular dependencies in packages/web/src ---');
const webSrc = path.resolve('packages/web/src');
const webGraph = buildGraph(webSrc, webSrc);
const webCycles = findCycles(webGraph);
console.log(`Web cycles found: ${webCycles.length}`);
if (webCycles.length > 0) {
  webCycles.forEach((c, i) => {
    console.log(`Cycle ${i + 1}:`, c.map((p) => path.relative(webSrc, p)).join(' -> '));
  });
}
