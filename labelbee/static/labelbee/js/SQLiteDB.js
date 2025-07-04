//import initSqlJs from 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/sql-wasm.js';

const initSqlJs = window.initSqlJs;

const SQL = await initSqlJs({
  locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
});


let db = new SQL.Database();
window.db = db;


document.getElementById('upload').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  const buffer = await file.arrayBuffer();
  db = new SQL.Database(new Uint8Array(buffer));
  console.log("✅ SQLite DB loaded.");
});

async function loadDatabaseFromUrl(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network error: ${response.status}`);

    const arrayBuffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(arrayBuffer));

    window.db = db;  // expose globally if you want
    console.log("✅ Database loaded from URL", url);
  } catch (error) {
    console.error("Failed to load database:", error);
  }
}
window.loadDatabaseFromUrl = loadDatabaseFromUrl

async function run_click() {
  if (!db) {
    alert("Please load DuckDB first.");
    return;
  }

  const query = document.getElementById('query').value;
  
  const tic = performance.now()
  try {
    const result = db.exec(query)[0];
    if (!result) {
      document.getElementById("output").innerHTML = "<p>No results.</p>";
      return;
    }
    const toc = performance.now()

    renderTable(result);
    document.getElementById("output").innerHTML += `<br>Time: ${toc-tic}`;
  } catch (e) {
    document.getElementById("output").innerHTML = `<pre>SQL Error: ${e.message}</pre>`;
  }
}

document.getElementById('run').addEventListener('click', run_click);

function renderTable(result) {
  const { columns, values } = result;
  let html = "<table><thead><tr>";
  html += columns.map(col => `<th>${col}</th>`).join("");
  html += "</tr></thead><tbody>";
  for (const row of values) {
    html += "<tr>" + row.map(val => `<td>${val}</td>`).join("") + "</tr>";
  }
  html += "</tbody></table>";
  document.getElementById("output").innerHTML = html;
}


