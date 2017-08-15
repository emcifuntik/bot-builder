document.createSVGElement = document.createElementNS.bind(document, 'http://www.w3.org/2000/svg');

const typeCounter = {};
let foreground, 
  background,
  boardViewBox = [0, 0, 0, 0],
  board,
  tooltip,
  moveBoard = false,
  moveElement = null,
  tempLine = document.createSVGElement('line'),
  right,
  offset = {x:0, y:0},
  elements = {};


class _Renderer {
  constructor() {
    this.onbeforeblockadd = (type) => {};
    this.onblockadd = (type) => {};
    this.onblockdelete = (id) => {};
    this.ontooltip = (id, cb) => {cb();};
    this.onconnection = (parent, child, cb) => {cb();};
    this.onblockmoving = (id, x, y, cb) => {cb();};
    this.onblockmoved = (id, x, y) => {};
    this.onconnectiondelete = (parent, child) => {};
    this.ondblclick = (id, cb) => {cb(false);}
  }
}
let Renderer = new _Renderer();

window.addEventListener('load', () => {
  foreground = document.createSVGElement('g');
  background = document.createSVGElement('g');
  tooltip = dom.class['tooltip-text'][0];
  board = dom.id.board;
  right = dom.class.right[0];

  board.appendChild(background);
  board.appendChild(foreground);
  board.addEventListener('mousemove', mouseMove);
  board.addEventListener('mousedown', mouseClick);
  board.addEventListener('contextmenu', function(event) {
    event.preventDefault();
  });

  let items = dom.class['tool-item'];
  for(let i in items)
  {
    if(items.hasOwnProperty(i))
    {
      items[i].addEventListener('dragstart', (event) => {
        currentDragItem = event.srcElement;
        offset = {
          x: event.offsetX,
          y: event.offsetY
        };
      });
    }
  }
  window.addEventListener('resize', (event) => {
    boardViewBox[2] = right.clientWidth;
    boardViewBox[3] = right.clientHeight;
    board.setAttribute("viewBox", boardViewBox.join());
  });
  right.addEventListener('dragover', (event) => {
    event.preventDefault();
  });
  right.addEventListener('drop', (event) => {
    event.preventDefault();
    Renderer.onbeforeblockadd(currentDragItem.getAttribute('data-tool'), () => {
      addRectToBoard(currentDragItem.getAttribute('data-tool'), foreground, background);
    });
  });
});

function getBlockName(type) {
  let textContent;
  if(type in typeCounter) {
    typeCounter[type]++;
  }
  else {
    typeCounter[type] = 1;
  }
  let Nr = typeCounter[type];

  switch (type) {
    case 'start':
      textContent = 'Старт';
      break;
    case 'text':
      textContent = 'Сообщение';
      break;
    case 'question':
      textContent = 'Вопрос';
      break;
    case 'answer':
      textContent = 'Ответ';
      break;
    case 'final':
      textContent = 'Финал';
      break;
    case 'pay':
      textContent = 'Оплата';
      break;
    case 'textinput':
      textContent = 'Ввод';
      break;
    case 'sendmail':
      textContent = 'Почта';
      break;
    case 'math':
      textContent = 'Арифметика';
      break;
    case 'condition':
      textContent = 'Условие';
      break;  
  }
  return textContent + ' #' + Nr;
}

function addRectToBoard(type, foreground, background, x, y) {
  let textContent = getBlockName(type);
  if (!x)
    x = event.offsetX - offset.x + boardViewBox[0];
  if (!y)
    y = event.offsetY - offset.y + boardViewBox[1];

  let group = document.createSVGElement('g');

  group.addEventListener('mousedown', blockMouseDown);
  group.addEventListener('mouseenter', blockMouseEnter);
  group.addEventListener('mouseleave', blockMouseLeave);
  group.addEventListener('dblclick', blockDoubleClick);

  let rect = document.createSVGElement('rect');
  let text = document.createSVGElement('text');

  rect.setAttributeNS(null, 'class', 'schemeRect ' + type + 'Rect');
  rect.setAttributeNS(null, 'x', x);
  rect.setAttributeNS(null, 'y', y);

  text.setAttributeNS(null, 'class', 'schemeText ' + type + 'Text');
  text.setAttributeNS(null, 'x', x + (190 / 2) - text.textLength.baseVal.value / 2);
  text.setAttributeNS(null, 'y', y + (50 / 2) + 16 / 2 - 2);

  let span = document.createSVGElement('tspan');
  span.setAttributeNS(null, 'text-anchor', 'middle');
  span.textContent = textContent;
  text.appendChild(span);

  group.appendChild(rect);
  group.appendChild(text);
  let info = {
    name: textContent,
    type: type,
    position: {
      x: x,
      y: y
    }
  };
  Renderer.onblockadd(info, (id) => {
    group.id = id;
    group.info = {
      children: [],
      parents: []
    }
    elements[id] = group;
    foreground.appendChild(group);
  });
}

function clearElements() {
  elements = {};
}

function loadConnections() {
  for(let e in elements) {
    let element = elements[e];
    for(let c in element.info.children)
    {
      let child = element.info.children[c] = {
        child: elements[element.info.children[c]],
        line: null,
        circle: null
      };
      if(!child.line)
      {
        let color = '#F3EBDD'
        if(Block.get(element.id).type == 'condition') {
          if(Block.get(element.id).children.length == 0)
            color = '#0000AA';
          else 
            color = '#AA0000';
        }
        Block.get(element.id).addChild(Block.get(child.child.id));

        child.line = document.createSVGElement('line');
        child.line.setAttributeNS(null, 'style', 'stroke-width:3');
        child.line.setAttributeNS(null, 'stroke', color);

        child.line.connects = {parent: element, child: child.child};

        let mdown = null;
        child.line.addEventListener('mousedown', lineMouseDown);
        child.line.addEventListener('mouseup', lineMouseUp);

        child.circle = document.createSVGElement('circle');
        child.circle.setAttributeNS(null, 'fill', color);
        child.circle.setAttributeNS(null, 'r', 5);

        background.appendChild(child.line);
        background.appendChild(child.circle);

        child.child.info.parents.push({
          parent: element,
          line: child.line,
          circle: child.circle
        });
      }
    }
    redrawLines(element);
  }
}

function loadBlock(name, id, x, y, children, type) {
  let group = document.createSVGElement('g');

  group.addEventListener('mousedown', blockMouseDown);
  group.addEventListener('mouseenter', blockMouseEnter);
  group.addEventListener('mouseleave', blockMouseLeave);
  group.addEventListener('dblclick', blockDoubleClick);

  let rect = document.createSVGElement('rect');
  let text = document.createSVGElement('text');

  rect.setAttributeNS(null, 'class', 'schemeRect ' + type + 'Rect');
  rect.setAttributeNS(null, 'x', x);
  rect.setAttributeNS(null, 'y', y);

  text.setAttributeNS(null, 'class', 'schemeText ' + type + 'Text');
  text.setAttributeNS(null, 'x', x + (190 / 2) - text.textLength.baseVal.value / 2);
  text.setAttributeNS(null, 'y', y + (50 / 2) + 16 / 2 - 2);

  let span = document.createSVGElement('tspan');
  span.setAttributeNS(null, 'text-anchor', 'middle');
  span.textContent = name;
  text.appendChild(span);

  group.appendChild(rect);
  group.appendChild(text);
  group.id = id;
  group.info = {
    children: children,
    parents: []
  }
  elements[id] = group;
  foreground.appendChild(group);
  return group;
}

document.addEventListener('mouseup', (event) => {
  if (event.which == 3 && rightClicked) {
    rightClicked = false;
    if(connection.parent != null && connection.child != null && connection.parent != connection.child) {
      let con = true;
      for(let i in connection.parent.info.children) {
        if (connection.parent.info.children[i].child == connection.child.info.uid) {
          connection.child.children[0].setAttributeNS(null, 'class', 'schemeRect ' + Block.get(connection.child.children[0].id).type + 'Rect');
          connection.child = null;
          connection.parent = null;
          con = false;
          break;
        }
      }
      if(con) {
        Renderer.onconnection(connection.parent.id, connection.child.id, (color = '#F3EBDD') => {
          let line = document.createSVGElement('line');
          let blockPosParent = connection.parent.getBBox();
          line.setAttributeNS(null, 'style', 'stroke-width:3');
          line.setAttributeNS(null, 'stroke', color);
          line.setAttributeNS(null, 'x1', blockPosParent.x + blockPosParent.width/2);
          line.setAttributeNS(null, 'y1', blockPosParent.y + blockPosParent.height/2);
          let blockPosChild = connection.child.getBBox();
          let cross = lineCrossRect(
            blockPosParent.x + blockPosParent.width/2,
            blockPosParent.y + blockPosParent.height/2,
            blockPosChild.x + blockPosChild.width/2,
            blockPosChild.y + blockPosChild.height/2,
            blockPosChild.x,
            blockPosChild.y,
            blockPosChild.width,
            blockPosChild.height
          );
          line.setAttributeNS(null, 'x2', cross.x);
          line.setAttributeNS(null, 'y2', cross.y);

          let circle = document.createSVGElement('circle');
          circle.setAttributeNS(null, 'fill', color);
          circle.setAttributeNS(null, 'cx', cross.x);
          circle.setAttributeNS(null, 'cy', cross.y);
          circle.setAttributeNS(null, 'r', 5);

          line.connects = {
            parent: connection.parent,
            child: connection.child
          };

          line.addEventListener('mousedown', lineMouseDown);
          line.addEventListener('mouseup', lineMouseUp);

          background.appendChild(circle);
          background.appendChild(line);

          connection.parent.info.children.push({
            child: connection.child,
            line: line,
            circle: circle
          });
          connection.child.info.parents.push({
            parent: connection.parent,
            line: line,
            circle: circle
          });
          connection.child = null;
          connection.parent = null;
        });
        connection.child.children[0].setAttributeNS(null, 'class', 'schemeRect ' + Block.get(connection.child.id).type + 'Rect');
      }
    }
    background.removeChild(tempLine);
  }
  else if(event.which == 1 && moveElement != null){
    let pos = moveElement.getBBox();
    Renderer.onblockmoved(moveElement.id, pos.x, pos.y);
    moveElement = null;
  }
  else if(event.which == 3 && moveBoard){
    moveBoard = false;
  }
});

function redrawLines(element)
{
  for(let e of element.info.children)
  {
    if(e.child) {
      let blockPosParent = element.getBBox();
      e.line.setAttributeNS(null, 'x1', blockPosParent.x + blockPosParent.width/2);
      e.line.setAttributeNS(null, 'y1', blockPosParent.y + blockPosParent.height/2);
      let pos = e.child.getBBox();
      let cross = lineCrossRect(
        blockPosParent.x + blockPosParent.width/2,
        blockPosParent.y + blockPosParent.height/2,
        pos.x + pos.width/2,
        pos.y + pos.height/2,
        pos.x,
        pos.y,
        pos.width,
        pos.height
      );
      e.line.setAttributeNS(null, 'x2', cross.x);
      e.line.setAttributeNS(null, 'y2', cross.y);
      e.circle.setAttributeNS(null, 'cx', cross.x);
      e.circle.setAttributeNS(null, 'cy', cross.y);
    }
  }
  for(let e of element.info.parents)
  {
    if(e.parent) {
      let blockPosParent = e.parent.getBBox();
      let pos = element.getBBox();
      let cross = lineCrossRect(
        blockPosParent.x + blockPosParent.width/2,
        blockPosParent.y + blockPosParent.height/2,
        pos.x + pos.width/2,
        pos.y + pos.height/2,
        pos.x,
        pos.y,
        pos.width,
        pos.height
      );
      e.line.setAttributeNS(null, 'x2', cross.x);
      e.line.setAttributeNS(null, 'y2', cross.y);
      e.circle.setAttributeNS(null, 'cx', cross.x);
      e.circle.setAttributeNS(null, 'cy', cross.y);
    }
  }
}

function blockDoubleClick(event) {
  let element = this;
  Renderer.ondblclick(this.id, (isDelete) => {
    if(isDelete) {
      for(let child of element.info.children)
      {
        let c = child.child;
        let parentNr = null;
        if(c != undefined){
          for(let p in c.info.parents)
          {
            if(c.info.parents[p].parent === element) {
              parentNr = p;
              break;
            }
          }
          if(parentNr !== null) {
            background.removeChild(c.info.parents[parentNr].line);
            background.removeChild(c.info.parents[parentNr].circle);
            c.info.parents.splice(parentNr, 1);
          }
        }
      }

      for(let parent of element.info.parents)
      {
        let p = parent.parent;
        let childNr = null;
        for(let c in p.info.children)
        {
          if(p.info.children[c].child === element) {
            childNr = c;
            break;
          }
        }
        if(childNr !== null) {
          background.removeChild(parent.line);
          background.removeChild(parent.circle);
          Renderer.onconnectiondelete(p.id, element.id);
          p.info.children.splice(childNr, 1);
        }
      }
      Renderer.onblockdelete(element.id);
      tooltip.style.display = 'none';
      foreground.removeChild(element);
    }
  });
}

function blockMouseDown(event) {
  if (event.which == 3 && moveElement == null && !moveBoard) {
    rightClicked = true;
    connection.parent = this;
    let blockPos = this.getBBox();
    tempLine.setAttributeNS(null, 'x1', blockPos.x + blockPos.width / 2);
    tempLine.setAttributeNS(null, 'x2', blockPos.x + blockPos.width / 2);
    tempLine.setAttributeNS(null, 'y1', blockPos.y + blockPos.height / 2);
    tempLine.setAttributeNS(null, 'y2', blockPos.y + blockPos.height / 2);
    tempLine.setAttributeNS(null, 'style', 'stroke:#F3EBDD;stroke-width:3');
    background.appendChild(tempLine);
  } else if (event.which == 1 && !rightClicked && !moveBoard) {
    moveElement = this;
    let curPos = this.getBBox();
    offset = {
      x: event.offsetX - curPos.x,
      y: event.offsetY - curPos.y
    }
  }
}

function lineMouseDown(event) {
  if (event.which == 3)
    mdown = this;
}
function lineMouseUp(event) {
  if (event.which == 3 && mdown == this)
  {
    mdown = null;
    let parentNr = null;
    for(let i in this.connects.child.info.parents)
    {
      if(this.connects.child.info.parents[i].parent == this.connects.parent)
      {
        parentNr = i;
        break;
      }
    }

    let childNr = null;
    for(let i in this.connects.parent.info.children)
    {
      if(this.connects.parent.info.children[i].child == this.connects.child)
      {
        childNr = i;
        break;
      }
    }
    let circle = this.connects.child.info.parents[parentNr].circle;
    let parentId = this.connects.child.info.parents[parentNr].parent.id;
    let childId = this.connects.parent.info.children[childNr].child.id;
    Renderer.onconnectiondelete(parentId, childId);
    this.connects.child.info.parents.splice(parentNr, 1);
    this.connects.parent.info.children.splice(childNr, 1);
    background.removeChild(this);
    background.removeChild(circle);
  }
}

function blockMouseLeave(event) {
  if (this != connection.parent && rightClicked) {
    this.children[0].setAttributeNS(null, 'class', 'schemeRect ' + Block.get(this.children[0].id).type + 'Rect');
    connection.child = null;
  }
  tooltip.style.display = 'none';
}

function blockMouseEnter(event) {
  if (this != connection.parent && rightClicked) {
    this.children[0].setAttributeNS(null, 'class', 'rectActive');
    connection.child = this;
  }
  Renderer.ontooltip(this.id, (text) => {
    let bbox = this.getBBox();
    let ctm = board.getBoundingClientRect();
    tooltip.style.display = 'flex';
    tooltip.innerText = text;
    tooltip.style.left = (bbox.x + ctm.left + bbox.width / 2 - tooltip.clientWidth / 2 - boardViewBox[0]) + 'px';
    tooltip.style.top = (bbox.y + ctm.top - tooltip.clientHeight - 10 - boardViewBox[1]) + 'px';
  });
}

function mouseMove(event)
{
  if(rightClicked && !moveBoard)
  {
    let pos = {x: event.offsetX, y: event.offsetY};
    tempLine.setAttributeNS(null, 'x2', pos.x + boardViewBox[0]);
    tempLine.setAttributeNS(null, 'y2', pos.y + boardViewBox[1]);
  }
  else if(moveElement != null && !moveBoard)
  {
    Renderer.onblockmoving(moveElement.id, event.offsetX - offset.x, event.offsetY - offset.y, () => {
      let rect = moveElement.children[0];
      rect.setAttributeNS(null,'class', 'schemeRect ' + Block.get(moveElement.id).type + 'Rect');
      rect.setAttributeNS(null,'x', event.offsetX - offset.x);
      rect.setAttributeNS(null,'y', event.offsetY - offset.y);

      let text = moveElement.children[1];
      text.setAttributeNS(null,'class', 'schemeText ' + Block.get(moveElement.id).type + 'Text');
      text.setAttributeNS(null,'x', event.offsetX - offset.x + (190/2));
      text.setAttributeNS(null,'y', event.offsetY - offset.y + (50/2) + 16 / 2 - 2);
      redrawLines(moveElement);

      Renderer.ontooltip(moveElement.id, (text) => {
        let bbox = moveElement.getBBox();
        let ctm = board.getBoundingClientRect();
        tooltip.style.display = 'flex';
        tooltip.innerText = text;
        tooltip.style.left = (bbox.x + ctm.left + bbox.width/2 - tooltip.clientWidth/2 - boardViewBox[0]) + 'px';
        tooltip.style.top = (bbox.y + ctm.top - tooltip.clientHeight - 10 - boardViewBox[1]) + 'px';
      });
    });
  }
  else if(moveBoard && !rightClicked)
  {
    boardViewBox[0] -= event.movementX;
    boardViewBox[1] -= event.movementY;
    boardViewBox[2] = right.clientWidth;
    boardViewBox[3] = right.clientHeight;
    board.setAttribute("viewBox", boardViewBox.join());
  }
}

function mouseClick(event)
{
  if(event.which == 3 && !rightClicked && !moveElement)
    moveBoard = true;
}