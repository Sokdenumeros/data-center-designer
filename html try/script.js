// Sample predefined objects
const objects = [
  {
    id: 1,
    name: 'Transformer_100',
    isInput: true,
    inputs: [{ unit: 'Grid_Connection', amount: 1 },{ unit: 'size_x', amount: 40 },{ unit: 'size_y', amount: 10 }],
    outputs: [{ unit: 'Space_X', amount: 40 }, { unit: 'Space_Y', amount: 45 }]
  },
  {
    id: 2,
    name: 'Battery_200',
    isInput: false,
    inputs: [{ unit: 'Power_Cell', amount: 2 },{ unit: 'size_x', amount: 40 },{ unit: 'size_y', amount: 30 }],
    outputs: [{ unit: 'Grid_Connection', amount: 1 }]
  },
  {
    id: 3,
    name: 'Generator_300',
    isInput: true,
    inputs: [{ unit: 'Fuel', amount: 3 }, { unit: 'size_x', amount: 40 },{ unit: 'size_y', amount: 50 }],
    outputs: [{ unit: 'Electricity', amount: 5 }]
  }
];

// Render sidebar items
const sidebar = document.getElementById('sidebar');
const canvas = document.getElementById('canvas');
const stats = document.getElementById('stats');

let droppedObjects = [];

objects.forEach(obj => {
  const el = document.createElement('div');
  el.className = 'item';
  el.textContent = `${obj.name}`;
  el.setAttribute('draggable', 'true');
  el.dataset.object = JSON.stringify(obj);
  el.dataset.origin = 'sidebar'; // ⬅️ Important flag

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

function addToCanvas(obj, x, y) {
  const el = document.createElement('div');
  el.className = 'dropped';
  el.textContent = obj.name;

  const sizeX = getInputAmount(obj, 'size_x') || 80;
  const sizeY = getInputAmount(obj, 'size_y') || 40;

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
  el.addEventListener('mousedown', function startDrag(e) {
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
  updateStats();
}

function getInputAmount(obj, key) {
  const found = obj.inputs?.find(input => input.unit === key);
  return found ? Number(found.amount) : null;
}

function updateStats() {
  const inputSums = {};
  const outputSums = {};

  for (const obj of droppedObjects) {
    for (const input of obj.inputs || []) {
      if (!['size_x', 'size_y'].includes(input.unit)) {
        inputSums[input.unit] = (inputSums[input.unit] || 0) + Number(input.amount);
      }
    }

    for (const output of obj.outputs || []) {
      outputSums[output.unit] = (outputSums[output.unit] || 0) + Number(output.amount);
    }
  }

  let html = `<strong>🔌 Inputs</strong><ul>`;
  for (const [unit, total] of Object.entries(inputSums)) {
    html += `<li>${unit}: ${total}</li>`;
  }
  html += `</ul><strong>⚡ Outputs</strong><ul>`;
  for (const [unit, total] of Object.entries(outputSums)) {
    html += `<li>${unit}: ${total}</li>`;
  }
  html += '</ul>';

  stats.innerHTML = html;
}
