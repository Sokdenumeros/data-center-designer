let droppedObjects = [];
let selectedSpecObject = null;
let parsedObjects = [];
let sidebarItems = [];
let lastMoved = null;
let scale = 1;

function renderSidebarItems(objects) {
  const sidebar = document.getElementById('sidebar');
  const canvas = document.getElementById('canvas');
  sidebarItems = objects;
  sidebar.innerHTML = ''; // Limpiar contenido anterior si lo hubiera

  objects.forEach(obj => {
    const el = document.createElement('div');
    el.className = 'item';
    el.textContent = `${obj.name}`;
    el.setAttribute('draggable', 'true');
    el.dataset.object = JSON.stringify(obj);
    el.dataset.origin = 'sidebar';

    el.addEventListener('click', () => {
      addToCanvas(obj, 20, 20);
    });

    el.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify(obj));
      e.dataTransfer.setData('origin', 'sidebar');
    });

    sidebar.appendChild(el);
  });

  canvas.addEventListener('dragover', e => e.preventDefault());

  canvas.addEventListener('drop', e => {
    e.preventDefault();

    const data = e.dataTransfer.getData('text/plain');
    const origin = e.dataTransfer.getData('origin');

    if (origin === 'sidebar') {
      const obj = JSON.parse(data);
      addToCanvas(obj, e.offsetX, e.offsetY);
    }
  });
}

function clearCanvas() {
  const canvas = document.getElementById('canvas');

  // Remove all elements with class "dropped"
  const droppedElements = canvas.querySelectorAll('.dropped');
  droppedElements.forEach(el => el.remove());

  // Clear droppedObjects array
  droppedObjects.length = 0;

  // Reset stats display
  updateStats();
}

function clearScale(scale) {
  const canvas = document.getElementById('canvas');
  const droppedElements = canvas.querySelectorAll('.dropped');

  droppedElements.forEach(el => {
    const currentWidth = parseFloat(el.style.width);
    const currentHeight = parseFloat(el.style.height);

    if (!isNaN(currentWidth) && !isNaN(currentHeight)) {
      el.style.width = (currentWidth * scale) + 'px';
      el.style.height = (currentHeight * scale) + 'px';
    }
  });
}


document.getElementById('clearBtn').addEventListener('click', clearCanvas);

function addToCanvas(obj, x, y) {
  const el = document.createElement('div');
  el.className = 'dropped';
  el.textContent = obj.name;

  const sizeX = (getInputAmount(obj, 'Space_X')*scale) || 80;
  const sizeY = (getInputAmount(obj, 'Space_Y')*scale) || 40;

  el.style.width = sizeX + 'px';
  el.style.height = sizeY + 'px';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.setAttribute('draggable', 'true');

  el.addEventListener('dragstart', (e) => {
    // Mark this drag as internal — so drop handler ignores it
    e.dataTransfer.setData('origin', 'canvas');
  });

  // Movable within canvas
  el.addEventListener('mousedown', 
    function startDrag(e) {
    lastMoved = el;
    const startX = e.clientX;
    const startY = e.clientY;
    const origX = parseInt(el.style.left);
    const origY = parseInt(el.style.top);

    function dragMove(e) {
      el.style.left = origX + (e.clientX - startX) + 'px';
      el.style.top = origY + (e.clientY - startY) + 'px';
    }

    function endDrag() {
      document.removeEventListener('mousemove', dragMove);
      document.removeEventListener('mouseup', endDrag);
    }

    document.addEventListener('mousemove', dragMove);
    document.addEventListener('mouseup', endDrag);
  });

  canvas.appendChild(el);
  droppedObjects.push(obj);
  lastMoved = el;
  updateStats();
}

document.getElementById('deleteOneBtn').addEventListener('click', function () {
  if (lastMoved && lastMoved.parentElement) {
    lastMoved.parentElement.removeChild(lastMoved);

    // Buscar y eliminar el objeto asociado de droppedObjects
    const name = lastMoved.textContent;
    const index = droppedObjects.findIndex(obj => obj.name === name);
    if (index !== -1) {
      droppedObjects.splice(index, 1);
    }

    lastMoved = null;
    updateStats();
  }
});


function getInputAmount(obj, key) {
  const found = obj.inputs?.find(input => input.unit === key);
  return found ? Number(found.amount) : null;
}

function findPartialSolution(sidebarItems, specObject, maxAttempts = 100) {
  const selected = [];
  const totals = {};

  const below = (specObject.belowAmount || []).reduce((map, b) => {
    map[b.unit] = b.amount;
    return map;
  }, {});

  const above = (specObject.aboveAmount || []).reduce((map, a) => {
    map[a.unit] = a.amount;
    return map;
  }, {});

  let attempts = 0;

  while (attempts < maxAttempts) {
    let improved = false;

    for (const item of sidebarItems) {
      const testTotals = { ...totals };

      for (const output of item.outputs || []) {
        testTotals[output.unit] = (testTotals[output.unit] || 0) + output.amount;
      }
      for (const input of item.inputs || []) {
        testTotals[input.unit] = (testTotals[input.unit] || 0) - input.amount;
      }

      // Check if this item improves at least one unmet constraint
      const improvesSomething = Object.keys(above).some(unit =>
        (testTotals[unit] || 0) > (totals[unit] || 0) && (testTotals[unit] || 0) < above[unit]
      ) || Object.keys(below).some(unit =>
        (testTotals[unit] || 0) < (totals[unit] || 0) && (testTotals[unit] || 0) > below[unit]
      );

      if (improvesSomething) {
        selected.push(item);
        Object.assign(totals, testTotals); // Accept new totals
        improved = true;
        break; // Only add one per iteration
      }
    }

    if (!improved) break; // No progress, exit loop
    attempts++;
  }

  return selected;
}

function firstSolution() {
  const solution = findPartialSolution(sidebarItems, selectedSpecObject);

  if (!solution.length) {
    alert("⚠️ No viable modules could be added.");
    return;
  }

  let x = 20, y = 20;
  const step = 110;

  for (const mod of solution) {
    addToCanvas(mod, x, y);
    y += step;
    if (y > 500) { x += step; y = 20; }
  }

  updateStats();
}
document.getElementById('generateBtn').addEventListener('click', firstSolution);

function updateStats() {
  const netTotals = {};

  // Combine inputs (subtract) and outputs (add)
  for (const obj of droppedObjects) {
    for (const input of obj.inputs || []) {
      if (!['Space_X', 'Space_Y'].includes(input.unit)) {
        netTotals[input.unit] = (netTotals[input.unit] || 0) - Number(input.amount);
      }
    }

    for (const output of obj.outputs || []) {
      netTotals[output.unit] = (netTotals[output.unit] || 0) + Number(output.amount);
    }
  }

  // Convert spec lists to maps
  const below = selectedSpecObject?.belowAmount?.reduce((map, item) => {
    map[item.unit] = item.amount;
    return map;
  }, {}) || {};

  const above = selectedSpecObject?.aboveAmount?.reduce((map, item) => {
    map[item.unit] = item.amount;
    return map;
  }, {}) || {};

  // Render the single list
  let html = `<strong>📊 Resource Balance</strong><ul>`;
  for ([unit, total] of Object.entries(netTotals)) {
    let color = 'green';
    
    if (below[unit] !== undefined) total = -total;
    else if(total < 0) color = 'red';
    if (below[unit] !== undefined && total > below[unit]) color = 'red';
    if (above[unit] !== undefined && total < above[unit]) color = 'red';

    html += `<li style="color: ${color}">${unit}: ${total}</li>`;
  }
  html += '</ul>';

  stats.innerHTML = html;
}



function processCSVSpecs(file, callback) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const csvText = e.target.result;
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());

    const rows = lines.slice(1).map(line => {
      const values = line.split(';').map(v => v.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i];
      });
      return row;
    });

    const grouped = {};

    for (const row of rows) {
      const key = `${row.ID}-${row.Name}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: parseInt(row.ID),
          name: row.Name,
          belowAmount: [],
          aboveAmount: [],
          minimize: [],
          maximize: [],
          unconstrained: []
        };
      }

      const entry = {
        unit: row.Unit,
        amount: parseFloat(row.Amount)
      };

      if (row.Below_Amount === '1') grouped[key].belowAmount.push(entry);
      if (row.Above_Amount === '1') grouped[key].aboveAmount.push(entry);
      if (row.Minimize === '1') grouped[key].minimize.push(entry);
      if (row.Maximize === '1') grouped[key].maximize.push(entry);
      if (row.Unconstrained === '1') grouped[key].unconstrained.push(entry);
    }

    const result = Object.values(grouped);
    callback(result);
  };

  reader.readAsText(file);
}


function processCSVModules(file, callback) {
  const reader = new FileReader();

  reader.onload = function (e) {
    const csvText = e.target.result;
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(';').map(h => h.trim());

    const rows = lines.slice(1).map(line => {
      const values = line.split(';').map(v => v.trim());
      const row = {};
      headers.forEach((h, i) => {
        row[h] = values[i];
      });
      return row;
    });

    const grouped = {};

    for (const row of rows) {
      const key = `${row.ID}-${row.Name}`;
      if (!grouped[key]) {
        grouped[key] = {
          id: parseInt(row.ID),
          name: row.Name,
          isInput: false, // se definirá si hay alguna fila con Is_Input = 1
          inputs: [],
          outputs: []
        };
      }

      const entry = {
        unit: row.Unit,
        amount: parseFloat(row.Amount)
      };

      if (row.Is_Input === '1') {
        grouped[key].inputs.push(entry);
        grouped[key].isInput = true; // si hay al menos un input, se considera de entrada
      }

      if (row.Is_Output === '1') {
        grouped[key].outputs.push(entry);
      }
    }

    const result = Object.values(grouped);
    callback(result);
  };

  reader.readAsText(file);
}

document.getElementById('specFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (file) {
    processCSVSpecs(file, function (results) {
      parsedObjects = results;
      populateDropdown(parsedObjects);
    });
  }
});

function populateDropdown(objects) {
  const select = document.getElementById('objectSelector');
  select.innerHTML = '<option value="">-- Choose one --</option>'; // Reset

  objects.forEach((obj, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = `${obj.name} (ID: ${obj.id})`;
    select.appendChild(option);
  });
}

document.getElementById('objectSelector').addEventListener('change', function () {
  const selectedIndex = this.value;
  const detailsDiv = document.getElementById('objectDetails');

  if (selectedIndex !== '') {

    selectedSpecObject = parsedObjects[selectedIndex];
    tempX= getInputAmountSpec(selectedSpecObject, 'Space_X');
    clearScale(1/scale);
    scale =  tempX ? Number(600/tempX) : 1;
    clearScale(scale);
    detailsDiv.innerHTML = formatObjectDetails(selectedSpecObject);
    drawCenteredBoxFromSpec(selectedSpecObject);
  } else {

    selectedSpecObject = null;
    detailsDiv.innerHTML = '';
    clearScale(1/scale);
    scale = 1;
    clearScale(scale);
    delSquares();
  }

  updateStats();
});

function drawCenteredBoxFromSpec(spec) {
  // Eliminar cuadro anterior si existe
  delSquares();

  // Obtener dimensiones
  const width = getInputAmountSpec(spec, 'Space_X');
  const height = getInputAmountSpec(spec, 'Space_Y');

  if (width == null || height == null) return;

  const scaledWidth = width * scale;
  const scaledHeight = height * scale;

  // Crear el cuadro
  const box = document.createElement('div');
  box.id = 'specBox';
  box.style.position = 'fixed';
  box.style.width = scaledWidth + 'px';
  box.style.height = scaledHeight + 'px';
  box.style.border = '2px solid green';
  box.style.backgroundColor = 'transparent';
  box.style.left = `calc(50% - ${scaledWidth / 2}px)`;
  box.style.top = `calc(50% - ${scaledHeight / 2}px)`;
  box.style.pointerEvents = 'none';
  document.body.appendChild(box);

  // Crear la etiqueta
  const label = document.createElement('div');
  label.id = 'specBoxLabel';
  label.textContent = `W: ${scaledWidth}px | H: ${scaledHeight}px`;
  label.style.position = 'fixed';
  label.style.left = `calc(50% + ${scaledWidth / 2 + 10}px)`;
  label.style.top = `calc(50% - ${scaledHeight / 2}px)`;
  label.style.color = 'green';
  label.style.fontWeight = 'bold';
  label.style.backgroundColor = 'white';
  label.style.padding = '2px 4px';
  label.style.border = '1px solid green';
  label.style.borderRadius = '4px';
  label.style.pointerEvents = 'none';
  document.body.appendChild(label);
}

function delSquares(){
  const oldBox = document.getElementById('specBox');
  const oldLabel = document.getElementById('specBoxLabel');
  if (oldBox) oldBox.remove();
  if (oldLabel) oldLabel.remove();
}

function getInputAmountSpec(obj, key) {
  const found = obj.belowAmount?.find(amount => amount.unit === key);
  return found ? Number(found.amount) : null;
}


function formatObjectDetails(obj) {
  let html = `<h3>${obj.name} (ID: ${obj.id})</h3>`;

  const printList = (title, items) => {
    if (!items || items.length === 0) return '';
    return `<strong>${title}</strong><ul>` +
      items.map(i => `<li>${i.unit}: ${i.amount}</li>`).join('') +
      '</ul>';
  };

  html += printList('Below Amount', obj.belowAmount);
  html += printList('Above Amount', obj.aboveAmount);
  html += printList('Minimize', obj.minimize);
  html += printList('Maximize', obj.maximize);
  html += printList('Unconstrained', obj.unconstrained);

  return html;
}
