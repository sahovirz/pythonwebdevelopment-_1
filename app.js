const canvas = document.querySelector('#canvas');
const layersList = document.querySelector('#layersList');
const tools = document.querySelectorAll('.tool');
const insertButtons = document.querySelectorAll('.insert-button');
const toast = document.querySelector('#toast');
const inspector = {
  type: document.querySelector('#selectedType'),
  name: document.querySelector('#layerName'),
  x: document.querySelector('#posX'),
  y: document.querySelector('#posY'),
  width: document.querySelector('#widthInput'),
  height: document.querySelector('#heightInput'),
  fill: document.querySelector('#fillInput'),
  gradient: document.querySelector('#gradientInput'),
  shape: document.querySelector('#shapeInput'),
  radius: document.querySelector('#radiusInput'),
  text: document.querySelector('#textInput'),
};

const gradientPresets = {
  none: '',
  aurora: 'linear-gradient(135deg, #67e8f9 0%, #8b5cf6 48%, #ec4899 100%)',
  sunset: 'linear-gradient(135deg, #f97316 0%, #facc15 42%, #ec4899 100%)',
  ocean: 'linear-gradient(135deg, #0ea5e9 0%, #14b8a6 52%, #22c55e 100%)',
  candy: 'radial-gradient(circle at 25% 20%, #fef3c7, #fb7185 42%, #8b5cf6 100%)',
  midnight: 'linear-gradient(135deg, #020617 0%, #312e81 48%, #0f766e 100%)',
};

const shapeStyles = ['rectangle', 'rounded', 'pill', 'circle', 'diamond', 'triangle'];
const layerCounts = {
  frame: 1,
  rect: 0,
  ellipse: 1,
  shape: 0,
  text: 0,
  comment: 1,
};

let selectedNode = document.querySelector('[data-id="frame"]');
let activeTool = 'select';
let dragState = null;
let toastTimer = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function getDesignNodes() {
  return [...document.querySelectorAll('[data-id]')];
}

function getEditableText(node) {
  if (node.dataset.textValue) return node.dataset.textValue;
  if (node.dataset.type === 'Text' || node.dataset.type === 'Comment') return node.textContent.trim();
  return '';
}

function setEditableText(node, value) {
  node.dataset.textValue = value;
  if (node.dataset.type === 'Text') node.textContent = value || 'Double-click to edit';
  if (node.dataset.type === 'Comment') node.textContent = value || 'Add feedback';
}

function readableColor(node) {
  const color = getComputedStyle(node).backgroundColor;
  const match = color.match(/\d+/g);
  if (!match) return '#7c3aed';
  return `#${match.slice(0, 3).map((value) => Number(value).toString(16).padStart(2, '0')).join('')}`;
}

function renderLayers() {
  layersList.innerHTML = '';
  getDesignNodes().forEach((node) => {
    const row = document.createElement('button');
    row.className = `layer-row${node === selectedNode ? ' active' : ''}`;
    row.innerHTML = `<span>${node.dataset.name}</span><small>${node.dataset.type}</small>`;
    row.addEventListener('click', () => selectNode(node));
    layersList.appendChild(row);
  });
}

function shapeFromNode(node) {
  return node.dataset.shape || (node.dataset.type === 'Ellipse' ? 'circle' : 'rounded');
}

function applyShapeKind(node, shapeKind) {
  node.dataset.shape = shapeKind;
  shapeStyles.forEach((style) => node.classList.remove(`shape-${style}`));
  node.classList.add(`shape-${shapeKind}`);

  if (shapeKind === 'rectangle' || shapeKind === 'diamond' || shapeKind === 'triangle') node.style.borderRadius = '0px';
  if (shapeKind === 'rounded') node.style.borderRadius = '24px';
  if (shapeKind === 'pill' || shapeKind === 'circle') node.style.borderRadius = '999px';
}

function applyGradient(node, gradientName) {
  node.dataset.gradient = gradientName;
  if (gradientName === 'none') {
    node.style.background = inspector.fill.value;
    return;
  }
  node.style.background = gradientPresets[gradientName];
}

function updateInspector(node) {
  const rect = node.getBoundingClientRect();
  const parentRect = (node.offsetParent || canvas).getBoundingClientRect();

  inspector.type.textContent = node.dataset.type;
  inspector.name.value = node.dataset.name;
  inspector.x.value = Math.round(rect.left - parentRect.left);
  inspector.y.value = Math.round(rect.top - parentRect.top);
  inspector.width.value = Math.round(rect.width);
  inspector.height.value = Math.round(rect.height);
  inspector.fill.value = readableColor(node);
  inspector.gradient.value = node.dataset.gradient || 'none';
  inspector.shape.value = shapeFromNode(node);
  inspector.radius.value = parseInt(getComputedStyle(node).borderRadius, 10) || 0;
  inspector.text.value = getEditableText(node);
  inspector.text.disabled = !['Text', 'Comment'].includes(node.dataset.type);
}

function selectNode(node) {
  if (!node) return;
  document.querySelectorAll('.selected').forEach((item) => item.classList.remove('selected'));
  selectedNode = node;
  selectedNode.classList.add('selected');
  updateInspector(selectedNode);
  renderLayers();
}

function setActiveTool(toolName) {
  activeTool = toolName;
  tools.forEach((tool) => tool.classList.toggle('active', tool.dataset.tool === toolName));
  insertButtons.forEach((button) => button.classList.toggle('active', button.dataset.insert === toolName));
  showToast(toolName === 'select' ? 'Select tool active' : `Click the canvas to add ${toolName}`);
}

function getPointIn(parent, event) {
  const parentRect = parent.getBoundingClientRect();
  return {
    x: Math.max(0, Math.round(event.clientX - parentRect.left)),
    y: Math.max(0, Math.round(event.clientY - parentRect.top)),
  };
}

function getTargetFrame(event) {
  return event.target.closest('.frame') || (event.target === canvas ? canvas : selectedNode.closest?.('.frame')) || document.querySelector('.frame');
}

function positionNode(node, x, y, width, height) {
  node.style.left = `${Math.max(0, Math.round(x - width / 2))}px`;
  node.style.top = `${Math.max(0, Math.round(y - height / 2))}px`;
  node.style.width = `${width}px`;
  node.style.height = `${height}px`;
}

function createFrame(event) {
  layerCounts.frame += 1;
  const frame = document.createElement('article');
  frame.className = 'frame free-frame shape-rounded';
  frame.dataset.id = `frame-${layerCounts.frame}`;
  frame.dataset.name = `Frame ${layerCounts.frame}`;
  frame.dataset.type = 'Frame';
  frame.dataset.shape = 'rounded';
  frame.dataset.gradient = 'none';
  frame.tabIndex = 0;
  const label = document.createElement('div');
  label.className = 'frame-label';
  label.textContent = `Custom / ${layerCounts.frame}`;
  frame.appendChild(label);
  const point = getPointIn(canvas, event);
  positionNode(frame, point.x, point.y, 360, 240);
  canvas.appendChild(frame);
  return frame;
}

function createRectangle(parent, point) {
  layerCounts.rect += 1;
  const node = document.createElement('div');
  node.className = 'node shape generated-layer generated-rectangle shape-rounded';
  node.dataset.id = `rectangle-${layerCounts.rect}`;
  node.dataset.name = `Rectangle ${layerCounts.rect}`;
  node.dataset.type = 'Rectangle';
  node.dataset.shape = 'rounded';
  node.dataset.gradient = 'ocean';
  node.tabIndex = 0;
  node.textContent = 'Shape';
  positionNode(node, point.x, point.y, 180, 110);
  parent.appendChild(node);
  applyGradient(node, node.dataset.gradient);
  return node;
}

function createEllipse(parent, point) {
  layerCounts.ellipse += 1;
  const node = document.createElement('div');
  node.className = 'node shape generated-layer generated-ellipse shape-circle';
  node.dataset.id = `ellipse-${layerCounts.ellipse}`;
  node.dataset.name = `Ellipse ${layerCounts.ellipse}`;
  node.dataset.type = 'Ellipse';
  node.dataset.shape = 'circle';
  node.dataset.gradient = 'sunset';
  node.tabIndex = 0;
  positionNode(node, point.x, point.y, 130, 130);
  parent.appendChild(node);
  applyGradient(node, node.dataset.gradient);
  return node;
}

function createCustomShape(parent, point) {
  layerCounts.shape += 1;
  const node = document.createElement('div');
  node.className = 'node shape generated-layer generated-custom-shape shape-diamond';
  node.dataset.id = `shape-${layerCounts.shape}`;
  node.dataset.name = `Shape ${layerCounts.shape}`;
  node.dataset.type = 'Shape';
  node.dataset.shape = 'diamond';
  node.dataset.gradient = 'aurora';
  node.tabIndex = 0;
  node.textContent = 'Shape';
  positionNode(node, point.x, point.y, 150, 150);
  parent.appendChild(node);
  applyGradient(node, node.dataset.gradient);
  return node;
}

function createText(parent, point) {
  layerCounts.text += 1;
  const node = document.createElement('div');
  node.className = 'node generated-layer text-layer shape-rounded';
  node.dataset.id = `text-${layerCounts.text}`;
  node.dataset.name = `Text ${layerCounts.text}`;
  node.dataset.type = 'Text';
  node.dataset.textValue = 'Double-click to edit';
  node.dataset.shape = 'rounded';
  node.dataset.gradient = 'none';
  node.tabIndex = 0;
  node.contentEditable = 'true';
  node.textContent = node.dataset.textValue;
  positionNode(node, point.x, point.y, 220, 58);
  parent.appendChild(node);
  return node;
}

function createComment(parent, point) {
  layerCounts.comment += 1;
  const node = document.createElement('div');
  node.className = 'node generated-layer comment-note shape-rounded';
  node.dataset.id = `comment-${layerCounts.comment}`;
  node.dataset.name = `Comment ${layerCounts.comment}`;
  node.dataset.type = 'Comment';
  node.dataset.textValue = 'Add feedback';
  node.dataset.shape = 'rounded';
  node.dataset.gradient = 'none';
  node.tabIndex = 0;
  node.contentEditable = 'true';
  node.textContent = node.dataset.textValue;
  positionNode(node, point.x, point.y, 190, 88);
  parent.appendChild(node);
  return node;
}

function createLayerFromTool(toolName, event) {
  if (toolName === 'frame') return createFrame(event);

  const parent = getTargetFrame(event);
  const point = getPointIn(parent, event);
  const creators = {
    rect: createRectangle,
    ellipse: createEllipse,
    shape: createCustomShape,
    text: createText,
    comment: createComment,
  };
  return creators[toolName]?.(parent, point);
}

function addLayer(toolName = 'rect', event = null) {
  const fallbackFrame = document.querySelector('.frame');
  const fallbackEvent = event || {
    target: fallbackFrame,
    clientX: fallbackFrame.getBoundingClientRect().left + 220,
    clientY: fallbackFrame.getBoundingClientRect().top + 220,
  };
  const node = createLayerFromTool(toolName, fallbackEvent);
  if (!node) return;
  selectNode(node);
  showToast(`${node.dataset.type} layer added`);
}

function startDrag(event) {
  const node = event.target.closest('.node, .free-frame');
  if (!node || activeTool !== 'select' || event.target.isContentEditable) return;

  selectNode(node);
  const rect = node.getBoundingClientRect();
  dragState = {
    node,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };
  node.setPointerCapture(event.pointerId);
}

function drag(event) {
  if (!dragState) return;
  const parentRect = dragState.node.offsetParent.getBoundingClientRect();
  const x = event.clientX - parentRect.left - dragState.offsetX;
  const y = event.clientY - parentRect.top - dragState.offsetY;
  dragState.node.style.left = `${Math.max(0, Math.round(x))}px`;
  dragState.node.style.top = `${Math.max(0, Math.round(y))}px`;
  updateInspector(dragState.node);
}

function stopDrag(event) {
  if (!dragState) return;
  dragState.node.releasePointerCapture(event.pointerId);
  dragState = null;
}

function applyInspectorChange(event) {
  if (!selectedNode) return;
  selectedNode.dataset.name = inspector.name.value || selectedNode.dataset.name;

  if (selectedNode.classList.contains('node') || selectedNode.classList.contains('free-frame')) {
    selectedNode.style.left = `${inspector.x.value}px`;
    selectedNode.style.top = `${inspector.y.value}px`;
  }

  selectedNode.style.width = `${Math.max(20, Number(inspector.width.value))}px`;
  selectedNode.style.height = `${Math.max(20, Number(inspector.height.value))}px`;

  if (event?.target === inspector.fill) {
    selectedNode.dataset.gradient = 'none';
    inspector.gradient.value = 'none';
    selectedNode.style.background = inspector.fill.value;
  }
  if (event?.target === inspector.gradient) {
    applyGradient(selectedNode, inspector.gradient.value);
  }

  applyShapeKind(selectedNode, inspector.shape.value);
  if (inspector.shape.value === 'rounded') selectedNode.style.borderRadius = `${inspector.radius.value}px`;
  if (!inspector.text.disabled) setEditableText(selectedNode, inspector.text.value);
  renderLayers();
}

function cycleSelectedShape() {
  if (!selectedNode) return;
  const currentIndex = shapeStyles.indexOf(shapeFromNode(selectedNode));
  const nextShape = shapeStyles[(currentIndex + 1) % shapeStyles.length];
  inspector.shape.value = nextShape;
  applyShapeKind(selectedNode, nextShape);
  updateInspector(selectedNode);
  showToast(`Shape changed to ${nextShape}`);
}

function deleteSelectedLayer() {
  if (!selectedNode) return;
  if (selectedNode.dataset.id === 'frame') {
    showToast('The starter frame stays on the canvas');
    return;
  }

  const fallback = selectedNode.parentElement?.closest('.frame') || document.querySelector('[data-id="frame"]') || canvas;
  selectedNode.remove();
  selectNode(fallback);
  showToast('Layer deleted');
}

tools.forEach((tool) => tool.addEventListener('click', () => setActiveTool(tool.dataset.tool)));
insertButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const toolName = button.dataset.insert;
    setActiveTool(toolName);
    addLayer(toolName);
  });
});
canvas.addEventListener('pointerdown', startDrag);
canvas.addEventListener('pointermove', drag);
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);
canvas.addEventListener('click', (event) => {
  const target = event.target.closest('[data-id]');
  if (activeTool === 'shape' && target && target !== canvas) {
    selectNode(target);
    cycleSelectedShape();
    setActiveTool('select');
    return;
  }

  if (activeTool !== 'select') {
    if (!target || target.classList.contains('frame') || target === canvas) {
      addLayer(activeTool, event);
      setActiveTool('select');
    }
    return;
  }
  if (target) selectNode(target);
});
canvas.addEventListener('input', (event) => {
  const target = event.target.closest('[data-type="Text"], [data-type="Comment"]');
  if (!target) return;
  target.dataset.textValue = target.textContent.trim();
  if (target === selectedNode) inspector.text.value = target.dataset.textValue;
});

document.querySelector('#addLayerButton').addEventListener('click', () => addLayer('rect'));
document.querySelector('#deleteLayerButton').addEventListener('click', deleteSelectedLayer);
document.querySelector('#presentButton').addEventListener('click', () => showToast('Presentation preview opened'));
document.querySelector('#shareButton').addEventListener('click', () => showToast('Share link copied to clipboard'));
Object.values(inspector).forEach((input) => {
  if (input.tagName === 'INPUT' || input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
    input.addEventListener('input', applyInspectorChange);
  }
});

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    addLayer(activeTool === 'select' ? 'rect' : activeTool);
  }

  if ((event.key === 'Backspace' || event.key === 'Delete') && !event.target.matches('input, textarea, [contenteditable="true"]')) {
    event.preventDefault();
    deleteSelectedLayer();
  }
});

selectNode(selectedNode);
