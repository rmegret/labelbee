//import initSqlJs from 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js';

//import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.1-dev132.0/+esm';
//import * as duckdb from '@duckdb/duckdb-wasm/dist/duckdb-esm.js';
//import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.1-dev132.0/+esm';

const duck = {}
window.duck = duck

import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.12.0/+esm'
import * as arrow from 'https://cdn.jsdelivr.net/npm/apache-arrow@latest/+esm'

duck.duckdb = duckdb
duck.arrow = arrow

const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
const bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
const worker_url = URL.createObjectURL(
  new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
);

const worker = new Worker(worker_url);
const logger = new duckdb.ConsoleLogger();
const db = new duckdb.AsyncDuckDB(logger, worker);
await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
URL.revokeObjectURL(worker_url);

const conn = await db.connect();
duck.db = db;
duck.conn = conn;

document.getElementById('upload')
  .addEventListener('change', duck.on_change_upload);


  
function initQueries() {
  const queries = [
    { label: 'List tables', value: 'SHOW TABLES' },
    { label: 'Get first rows', value: 'SELECT * FROM data LIMIT 10;' },
    { label: 'Get track lengths', value: `SELECT track_id,count(frame) FROM data
GROUP BY track_id
ORDER BY count(frame) DESC;` },
  ];

  const select = document.getElementById('premade-queries');
  queries.forEach(({ label, value }) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
  });
  const query = document.getElementById('query').value;
  select.addEventListener('change', (event) => {
    document.getElementById('query').value = event.target.options[event.target.selectedIndex].value;
    }
  )
}
initQueries()

async function on_change_upload(event) {
  const file = event.target.files[0];
  const arrayBuffer = await file.arrayBuffer();
  const blob = new Blob([arrayBuffer]);
  const fileName = file.name;

  await db.registerFileHandle(fileName, blob);
  await conn.query(`ATTACH '${fileName}' AS uploaded_db;`);
  console.log("✅ DuckDB database loaded from file.");
}
duck.on_change_upload = on_change_upload

document.getElementById('upload')
  .addEventListener('change', duck.on_change_upload);


async function loadCSVFromURL(url, table_name) {
  try {
    const fileName = url.split('/').pop();

    await db.registerFileURL(fileName, url);
    await conn.query(`CREATE TABLE ${table_name} AS SELECT * 
      FROM read_csv_auto('${fileName}')`);
    console.log("✅ DuckDB CSV loaded from URL:", url);
  } catch (error) {
    console.error(`Failed to load CSV from ${url}`, error);
  }
}
duck.loadCSVFromURL = loadCSVFromURL

async function run_click() {
  if (!db) {
    alert("Please instantiate DuckDB first.");
    return;
  }
  const query = document.getElementById('query').value;
  const output = document.getElementById('output');
  output.innerHTML = '';

  try {
    const tic = performance.now();
    const result = await conn.query(query);
    const toc = performance.now();

    if (!result) {
      output.innerHTML = "<p>No results.</p>";
      return;
    }

    const timeInfo = document.createElement('p');
    timeInfo.textContent = `Time: ${(toc - tic).toFixed(2)} ms`;
    output.appendChild(timeInfo);

    renderTable(result, output)
  } catch (e) {
    output.innerHTML = `<pre>SQL Error: ${e.message}</pre>`;
  }
}
duck.run_click = run_click

document.getElementById('run')
  .addEventListener('click', duck.run_click);

function renderTable(result) {
  const output = document.getElementById("output")
  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  for (const column of result.schema.fields) {
    const th = document.createElement('th');
    th.textContent = column.name;
    headerRow.appendChild(th);
  }
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  for (const row of result.toArray()) {
    const tr = document.createElement('tr');
    for (const col of result.schema.fields) {
      const td = document.createElement('td');
      td.textContent = row[col.name];
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  output.appendChild(table);
}
duck.renderTable = renderTable