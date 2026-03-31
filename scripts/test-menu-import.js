const fs = require('fs');
async function run() {
  const text = fs.readFileSync('data/Lotus’s Bangna–Trad (5032)_menu.csv', 'utf8');
  const res = await fetch('http://localhost:3000/api/menus/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': 'nicc_session=active' },
    body: JSON.stringify({ fileName: 'Lotus’s Bangna–Trad (5032)_menu.csv', csvText: text })
  });
  const data = await res.json();
  console.log(data);
}
run();
