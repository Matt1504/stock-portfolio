// Benchmark existing frontend calculation functions using locally saved GraphQL responses.
const fs = require('fs');
const ts = require('typescript');
const { performance } = require('perf_hooks');
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  }).outputText, filename);
}
const { portfolioStatistics } = require('../src/views/AccountView/portfolioStatistics.ts');
const { calculateCashBalance } = require('../src/views/AccountView/cashBalance.ts');
const { stockStatistics } = require('../src/views/MyStocksView/statistics.ts');
const file = process.argv[2];
if (!file) { process.stderr.write('Usage: node scripts/benchmark-statistics.cjs <local-response-snapshot.json>\n'); process.exit(1); }
const results = JSON.parse(fs.readFileSync(file, 'utf8'));
for (const [scope, response] of Object.entries(results)) {
  const rows = response.transactions;
  const calculate = scope === 'XEQT' ? () => stockStatistics(rows, rows[0]?.stock?.asset?.name, rows[0]?.stock?.id) : () => {
    portfolioStatistics(rows); calculateCashBalance(rows);
  };
  for (let i = 0; i < 10; i++) calculate();
  const samples = [];
  for (let i = 0; i < 100; i++) {
    const started = performance.now(); calculate(); samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  console.log(JSON.stringify({ scope, rows: rows.length, iterations: samples.length,
    calculation_median_ms: Number(samples[50].toFixed(3)), calculation_p95_ms: Number(samples[95].toFixed(3)) }));
}
