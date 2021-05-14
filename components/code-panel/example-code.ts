export default `// Basic nodes and globs

const nodeA = new Node({
  x: -100,
  y: 0,
});

const nodeB = new Node({
  x: 100,
  y: 0,
});

const glob = new Glob({
  start: nodeA,
  end: nodeB,
  D: { x: 0, y: 60 },
  Dp: { x: 0, y: 90 },
});

// Something more interesting...

const PI2 = Math.PI * 2,
  center = { x: 0, y: 0 },
  radius = 400;

let prev;

for (let i = 0; i < 21; i++) {
  const t = i * (PI2 / 20);

  const node = new Node({
    x: center.x + radius * Math.sin(t),
    y: center.y + radius * Math.cos(t),
  });

  if (prev !== undefined) {
    new Glob({
      start: prev,
      end: node,
      D: center,
      Dp: center,
    });
  }

  prev = node;
}
`
