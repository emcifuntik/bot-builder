let elements = [];
let rightClicked = false;
let connection = {
  parent: null,
  child: null
};
let tempLine = document.createSVGElement('line');
let offset = {};
let board = null;
let foreground = null;
let background = null;
let moveElement = null;
let moveBoard = false;
let boardViewBox = [0, 0, 0, 0];
let right = null;
let currentEdit = null;
let modal = {};
let tooltip = null;
let messageImage = null;
let imagePreview = null;
let botName = null;
let forceSave = false;
let currentImage = null;

function menuClick(action)
{
    switch(action){
        case 'new':
        {
            if(elements.length > 0 && confirm('Вы действительно хотите очистить текущую рабочую область?')) {
                foreground.innerHTML = '';
                background.innerHTML = '';
                elements = [];
                botName = null;
                forceSave = false;
                boardViewBox[0] = 0;
                boardViewBox[1] = 0;
                boardViewBox[2] = right.clientWidth;
                boardViewBox[3] = right.clientHeight;
                board.setAttribute("viewBox", boardViewBox.join());
            }
            break;
        }
        case 'open':
        {
            let oldName = botName;
            let name = prompt('Введите название для схемы бота', '');
            if (name != null && name != '')
                botName = name;
            else
                return;
            $.ajax({
                method: "POST",
                url: "/editor/open",
                data: { name: botName },
                dataType: 'json'
            })
            .done(function( msg ) {
                if(msg) {
                    if(elements.length > 0 && confirm('Вы действительно хотите очистить текущую рабочую область?')) {
                        foreground.innerHTML = '';
                        background.innerHTML = '';
                        elements = [];
                        botName = null;
                    }
                    boardViewBox[0] = 0;
                    boardViewBox[1] = 0;
                    boardViewBox[2] = right.clientWidth;
                    boardViewBox[3] = right.clientHeight;
                    board.setAttribute("viewBox", boardViewBox.join());
                    forceSave = true;
                    let elems = JSON.parse(msg.graph);
                    console.log(elems);
                    for(let i in elems)
                    {
                        if(elems.hasOwnProperty(i))
                        {
                            let elem = elems[i];
                            let e = addRectToBoard(elem.type, foreground, background, elem.uid, elem.position.x, parseInt(elem.position.y));
                            e.info.action = elem.action;
                            for(let j in elem.children)
                            {
                                e.info.children.push({
                                    child: elem.children[j],
                                    line: null,
                                    circle: null
                                });
                            }
                        }
                    }
                    for(let i in elements)
                    {
                        for(let c in elements[i].children)
                        {
                            let child = elements[i].children[c];
                            if(!child.line)
                            {
                                child.line = document.createSVGElement('line');
                                child.line.setAttributeNS(null, 'style', 'stroke-width:3');
                                child.line.setAttributeNS(null, 'stroke', '#F3EBDD');

                                child.line.connects = {parent: elements[i].element, child: findObject(child.child).element};
                                console.log(child.line.connects);

                                let mdown = null;
                                child.line.onmousedown= function(event) {
                                    if (event.which == 3)
                                        mdown = this;
                                };
                                child.line.onmouseup= function(event) {
                                    if (event.which == 3 && mdown == this)
                                    {
                                        mdown = null;
                                        let parentNr = null;
                                        for(let i in this.connects.child.info.parents)
                                        {
                                            if(this.connects.child.info.parents[i].parent == this.connects.parent.info.uid)
                                            {
                                                parentNr = i;
                                                break;
                                            }
                                        }

                                        let childNr = null;
                                        for(let i in this.connects.parent.info.children)
                                        {
                                            if(this.connects.parent.info.children[i].child == this.connects.child.info.uid)
                                            {
                                                childNr = i;
                                                break;
                                            }
                                        }
                                        let circle = this.connects.child.info.parents[parentNr].circle;
                                        this.connects.child.info.parents.splice(parentNr, 1);
                                        this.connects.parent.info.children.splice(childNr, 1);
                                        background.removeChild(this);
                                        background.removeChild(circle);
                                    }
                                };

                                child.circle = document.createSVGElement('circle');
                                child.circle.setAttributeNS(null, 'fill', '#F3EBDD');
                                child.circle.setAttributeNS(null, 'r', 5);

                                background.appendChild(child.line);
                                background.appendChild(child.circle);
                                console.log(child);
                                let ch = findObject(child.child);
                                ch.parents.push({
                                    parent: elements[i].uid,
                                    line: child.line,
                                    circle: child.circle
                                })
                            }
                        }
                        redrawLines(elements[i].element);
                    }
                }
                else {
                    botName = oldName;
                }
            }).fail(function() {
                console.log( "error" );
            })
            .always(function() {
                console.log( "complete" );
            });
            break;
        }
        case 'save':
        {
            if(botName == null) {
                let name = prompt('Введите название для схемы бота', '');
                if (name != null && name != '')
                    botName = name;
                else
                    return;
            }
            if(!forceSave) {
                $.ajax({
                    method: "POST",
                    url: "/editor/exist",
                    data: { name: botName }
                })
                .done(function( msg ) {
                    if(msg.result)
                    {
                        let rewrite = confirm('Схема бота с таким именем уже существует. Хотите перезаписать?');
                        if(rewrite)
                        {
                            let transportElements = elements.map(function(value) {
                                let bbox = value.element.getBBox();
                                return {
                                    uid: value.uid,
                                    type: value.type,
                                    position: {
                                        x: bbox.x,
                                        y: bbox.y
                                    },
                                    action: value.action,
                                    parents: value.parents.map(function(pValue){
                                        return pValue.parent;
                                    }),
                                    children: value.children.map(function(cValue){
                                        return cValue.child;
                                    })
                                };
                            });

                            $.ajax({
                                method: "POST",
                                url: "/editor/save",
                                data: { name: botName, graph: JSON.stringify(transportElements) }
                            })
                            .done(function( msg ) {
                                alert('Сохранено');
                                forceSave = true;
                            }).fail(function() {
                                console.log( "error" );
                            })
                            .always(function() {
                                console.log( "complete" );
                            });
                        }
                        else
                            return;
                    }
                    else
                    {
                        let transportElements = elements.map(function(value) {
                            let bbox = value.element.getBBox();
                            return {
                                uid: value.uid,
                                type: value.type,
                                position: {
                                    x: bbox.x,
                                    y: bbox.y
                                },
                                action: value.action,
                                parents: value.parents.map(function(pValue){
                                    return pValue.parent;
                                }),
                                children: value.children.map(function(cValue){
                                    return cValue.child;
                                })
                            };
                        });

                        $.ajax({
                            method: "POST",
                            url: "/editor/save",
                            data: { name: botName, graph: JSON.stringify(transportElements) }
                        })
                        .done(function( msg ) {
                            alert('Сохранено');
                        }).fail(function() {
                            console.log( "error" );
                        })
                        .always(function() {
                            console.log( "complete" );
                        });
                    }
                }).fail(function() {
                    console.log( "error" );
                })
                .always(function() {
                    console.log( "complete" );
                });
            }
            else {
                let transportElements = elements.map(function(value) {
                    let bbox = value.element.getBBox();
                    return {
                        uid: value.uid,
                        type: value.type,
                        position: {
                            x: bbox.x,
                            y: bbox.y
                        },
                        action: value.action,
                        parents: value.parents.map(function(pValue){
                            return pValue.parent;
                        }),
                        children: value.children.map(function(cValue){
                            return cValue.child;
                        })
                    };
                });

                $.ajax({
                    method: "POST",
                    url: "/editor/save",
                    data: { name: botName, graph: JSON.stringify(transportElements) }
                })
                .done(function( msg ) {
                    alert('Сохранено');
                }).fail(function() {
                    console.log( "error" );
                })
                .always(function() {
                    console.log( "complete" );
                });
            }
            break;
        }
        case 'saveAs':
        {
            let name = prompt('Введите название для схемы бота', '');
            if (name != null && name != '')
                botName = name;
            else
                return;
            $.ajax({
                method: "POST",
                url: "/editor/exist",
                data: { name: botName }
            })
            .done(function( msg ) {
                if(msg.result)
                {
                    let rewrite = confirm('Схема бота с таким именем уже существует. Хотите перезаписать?');
                    if(rewrite)
                    {
                        let transportElements = elements.map(function(value) {
                            let bbox = value.element.getBBox();
                            return {
                                uid: value.uid,
                                type: value.type,
                                position: {
                                    x: bbox.x,
                                    y: bbox.y
                                },
                                action: value.action,
                                parents: value.parents.map(function(pValue){
                                    return pValue.parent;
                                }),
                                children: value.children.map(function(cValue){
                                    return cValue.child;
                                })
                            };
                        });

                        $.ajax({
                            method: "POST",
                            url: "/editor/save",
                            data: { name: botName, graph: JSON.stringify(transportElements) }
                        })
                        .done(function( msg ) {
                            alert('Сохранено под именем "' + botName + '"');
                            forceSave = true;
                        })
                        .always(function() {
                            console.log( "complete" );
                        });
                    }
                    else
                        return;
                }
                else
                {
                    let transportElements = elements.map(function(value) {
                        let bbox = value.element.getBBox();
                        return {
                            uid: value.uid,
                            type: value.type,
                            position: {
                                x: bbox.x,
                                y: bbox.y
                            },
                            action: value.action,
                            parents: value.parents.map(function(pValue){
                                return pValue.parent;
                            }),
                            children: value.children.map(function(cValue){
                                return cValue.child;
                            })
                        };
                    });

                    $.ajax({
                        method: "POST",
                        url: "/editor/save",
                        data: { name: botName, graph: JSON.stringify(transportElements) }
                    })
                    .done(function( msg ) {
                        alert('Сохранено под именем "' + botName + '"');
                    }).fail(function() {
                        console.log( "error" );
                    });
                }
            }).fail(function() {
                console.log( "error" );
            })
            .always(function() {
                console.log( "complete" );
            });
            break;
        }
    }
}

function findObject(uid)
{
  for(let e in elements)
    if(elements[e].uid === uid)
      return elements[e];
  return null;
}

function redrawLines(element)
{
  for(let e in element.info.children)
  {
    let child = findObject(element.info.children[e].child);
    let line = element.info.children[e].line;
    let circle = element.info.children[e].circle;
    if(child) {
      let blockPosParent = element.getBBox();
      line.setAttributeNS(null, 'x1', blockPosParent.x + blockPosParent.width/2);
      line.setAttributeNS(null, 'y1', blockPosParent.y + blockPosParent.height/2);

      let pos = child.element.getBBox();
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
      line.setAttributeNS(null, 'x2', cross.x);
      line.setAttributeNS(null, 'y2', cross.y);
      circle.setAttributeNS(null, 'cx', cross.x);
      circle.setAttributeNS(null, 'cy', cross.y);
    }
  }

  for(let e in element.info.parents)
  {
    let parent = findObject(element.info.parents[e].parent);
    let line = element.info.parents[e].line;
    let circle = element.info.parents[e].circle;
    if(parent) {
      let blockPosParent = parent.element.getBBox();
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
      line.setAttributeNS(null, 'x2', cross.x);
      line.setAttributeNS(null, 'y2', cross.y);
      circle.setAttributeNS(null, 'cx', cross.x);
      circle.setAttributeNS(null, 'cy', cross.y);
    }
  }
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
        let rect = moveElement.children[0];
        rect.setAttributeNS(null,'class', 'startRect');
        rect.setAttributeNS(null,'x', event.offsetX - offset.x);
        rect.setAttributeNS(null,'y', event.offsetY - offset.y);

        let text = moveElement.children[1];
        text.setAttributeNS(null,'class', 'startText');
        text.setAttributeNS(null,'x', event.offsetX - offset.x + (190/2));
        text.setAttributeNS(null,'y', event.offsetY - offset.y + (50/2) + 16 / 2 - 2);
        redrawLines(moveElement);

        if(moveElement.info.action && moveElement.info.action.text)
        {
            let bbox = moveElement.getBBox();
            let ctm = board.getBoundingClientRect();
            tooltip.style.display = 'flex';
            tooltip.innerText = moveElement.info.action.text;
            tooltip.style.left = (bbox.x + ctm.left + bbox.width/2 - tooltip.clientWidth/2 - boardViewBox[0]) + 'px';
            tooltip.style.top = (bbox.y + ctm.top - tooltip.clientHeight - 10 - boardViewBox[1]) + 'px';
        }
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

function modalDelete() {
    for(let child of currentEdit.info.children)
    {
        let c = findObject(child.child);
        let parentNr = null;
        for(let p in c.parents)
        {
            if(c.parents[p].parent === currentEdit.info.uid) {
                parentNr = p;
                break;
            }
        }
        if(parentNr !== null) {
            background.removeChild(c.parents[parentNr].line);
            background.removeChild(c.parents[parentNr].circle);
            c.parents.splice(parentNr, 1);
        }
    }

    for(let parent of currentEdit.info.parents)
    {
        let p = findObject(parent.parent);
        let childNr = null;
        for(let c in p.children)
        {
            if(p.children[c].child === currentEdit.info.uid) {
                childNr = c;
                break;
            }
        }
        if(childNr !== null) {
            background.removeChild(parent.line);
            background.removeChild(parent.circle);
            p.children.splice(childNr, 1);
        }
    }

    foreground.removeChild(currentEdit.info.element);
    elements.splice(elements.indexOf(currentEdit.info), 1);
    modal.background.style.display = 'none';
}

function modalClose() {
    modal.background.style.display = 'none';
    if(currentEdit.info.type == 'pay')
        modal[currentEdit.info.type].style.display = 'none';
}

function modalSave() {
    if(currentEdit.info.type != 'pay')
    {
        currentEdit.info.action = {
            text: modal.text.value,
            image: currentImage
        }
    }
    else
    {
        currentEdit.info.action = {
            text: modal.text.value,
            image: currentImage,
            paymentId: modal.paymentId.value,
            paymentValue: modal.paymentValue.value
        };
        modal[currentEdit.info.type].style.display = 'none';
    }
    modal.background.style.display = 'none';
}

function addRectToBoard(type, foreground, background, uid, x, y)
{
    let textContent = '';
    if(!uid)
        uid = randString();
    if(!x)
        x = event.offsetX - offset.x + boardViewBox[0];
    if(!y)
        y = event.offsetY - offset.y + boardViewBox[1];

    switch(type)
    {
        case 'start':
        {
            textContent = 'Старт';
            break;
        }
        case 'text':{
            textContent = 'Сообщение';
            break;
        }
        case 'question':{
            textContent = 'Вопрос';
            break;
        }
        case 'answer':{
            textContent = 'Ответ';
            break;
        }
        case 'final':{
            textContent = 'Финал';
            break;
        }
        case 'pay':{
            textContent = 'Оплата';
            break;
        }
    }

    let group = document.createSVGElement('g');

    group.addEventListener('mousedown', function(event) {
        if (event.which == 3 && moveElement == null && !moveBoard) {
            rightClicked = true;
            connection.parent = this;
            let blockPos = this.getBBox();
            tempLine.setAttributeNS(null, 'x1', blockPos.x + blockPos.width/2);
            tempLine.setAttributeNS(null, 'x2', blockPos.x + blockPos.width/2);
            tempLine.setAttributeNS(null, 'y1', blockPos.y + blockPos.height/2);
            tempLine.setAttributeNS(null, 'y2', blockPos.y + blockPos.height/2);
            tempLine.setAttributeNS(null, 'style', 'stroke:#F3EBDD;stroke-width:3');
            background.appendChild(tempLine);
        }
        else if(event.which == 1 && !rightClicked && !moveBoard){
            moveElement = this;
            let curPos = this.getBBox();
            offset = {x: event.offsetX - curPos.x, y: event.offsetY - curPos.y}
        }
    });

    group.addEventListener('mouseenter', function(event) {
        if(this != connection.parent && rightClicked)
        {
            this.children[0].setAttributeNS(null, 'class', 'rectActive');
            connection.child = this;
        }
        if(this.info.action && this.info.action.text)
        {
            let bbox = this.getBBox();
            let ctm = board.getBoundingClientRect();
            tooltip.style.display = 'flex';
            tooltip.innerText = this.info.action.text;
            tooltip.style.left = (bbox.x + ctm.left + bbox.width/2 - tooltip.clientWidth/2 - boardViewBox[0]) + 'px';
            tooltip.style.top = (bbox.y + ctm.top - tooltip.clientHeight - 10 - boardViewBox[1]) + 'px';
        }
    });
    group.addEventListener('mouseleave', function(event) {
        if(this != connection.parent && rightClicked)
        {
            this.children[0].setAttributeNS(null, 'class', 'startRect');
            connection.child = null;
        }
        tooltip.style.display = 'none';
    });

    group.addEventListener('dblclick', function(event) {
        currentEdit = this;
        modal.background.style.display = 'flex';
        if(currentEdit.info.type == 'pay')
            modal[currentEdit.info.type].style.display = 'flex';

        modal.text.value = '';
        modal.image.value = '';
        modal.imageUrl.value = '';
        modal.paymentId.value = '';
        modal.paymentValue.value = '';
        messageImage.value = '';
        imagePreview.src = '';
        currentImage = null;

        if(this.info.action != null)
        {
            if(this.info.action.image)
            {
                imagePreview.src = this.info.action.image;
                currentImage = this.info.action.image;
                messageImage.value = '';
            }
            if(this.info.action.text)
                modal.text.value = this.info.action.text;
            if(this.info.action.paymentId)
                modal.paymentId.value = this.info.action.paymentId;
            if(this.info.action.paymentValue)
                modal.paymentValue.value = this.info.action.paymentValue;
        }
    });

    let rect = document.createSVGElement('rect');
    let text = document.createSVGElement('text');

    rect.setAttributeNS(null,'class', 'startRect');
    rect.setAttributeNS(null,'x', x);
    rect.setAttributeNS(null,'y', y);

    text.setAttributeNS(null,'class', 'startText');
    text.setAttributeNS(null,'x', x + (190/2) - text.textLength.baseVal.value / 2);
    text.setAttributeNS(null,'y', y + (50/2) + 16 / 2 - 2);

    let span = document.createSVGElement('tspan');
    span.setAttributeNS(null, 'text-anchor', 'middle');
    span.textContent = textContent;
    text.appendChild(span);

    group.appendChild(rect);
    group.appendChild(text);
    foreground.appendChild(group);
    let info = {
        uid: uid,
        type: type,
        position: {
            x: x,
            y: y
        },
        element: group,
        parents: [],
        children: [],
        action: null
    };
    group.info = info;
    elements.push(info);
    return group;
}

window.addEventListener('load', function() {
    right = document.querySelector('.right');
    let currentDragItem = null;
    board = document.querySelector('#board');
    foreground = document.createSVGElement('g');
    background = document.createSVGElement('g');
    messageImage = document.querySelector('#message-image');
    imagePreview = document.querySelector('#message-image-preview');

    messageImage.addEventListener('change', (e) => {
        console.log(this);
        let file = messageImage.files[0]; //sames as here
        let reader  = new FileReader();
        reader.onloadend = function () {
            imagePreview.src = reader.result;
            currentImage = reader.result;
        };

        if (file) {
            reader.readAsDataURL(file); //reads the data as a URL
        } else {
            imagePreview.src = '';
        }
    });
    board.appendChild(background);
    board.appendChild(foreground);

    board.addEventListener('mousemove', mouseMove);
    board.addEventListener('mousedown', mouseClick);
    board.addEventListener('contextmenu', function(event) {
        event.preventDefault();
    });

    tooltip = document.querySelector('.tooltip-text');

    modal = {
        background: document.querySelector('.modal-background'),
        start: document.querySelector('#modal-content-start'),
        question: document.querySelector('#modal-content-question'),
        answer: document.querySelector('#modal-content-answer'),
        text: document.querySelector('#modal-content-text'),
        pay: document.querySelector('#modal-content-pay'),
        final: document.querySelector('#modal-content-final'),
        text: document.querySelector('#message-text'),
        image: document.querySelector('#message-image'),
        imageUrl: document.querySelector('#message-image-url'),
        paymentId: document.querySelector('#pay-id'),
        paymentValue: document.querySelector('#pay-value')
    };

    document.querySelector('#modal-close').addEventListener('click', function() { modalClose(); });
    document.querySelector('#modal-delete').addEventListener('click', function() { modalDelete(); });
    document.querySelector('#modal-save').addEventListener('click', function() { modalSave(); });

    let items = document.querySelectorAll('.tool-item');
    for(let i in items)
    {
        if(items.hasOwnProperty(i))
        {
            items[i].addEventListener('dragstart', function(event) {
                currentDragItem = event.srcElement;
                offset = {
                    x: event.offsetX,
                    y: event.offsetY
                };
            });
        }
    }
    window.addEventListener('resize', function(event) {
        boardViewBox[2] = right.clientWidth;
        boardViewBox[3] = right.clientHeight;
        board.setAttribute("viewBox", boardViewBox.join());
    });
    right.addEventListener('dragover', function(event) {
        event.preventDefault();
    });
    right.addEventListener('drop', function(event) {
        event.preventDefault();
        switch(currentDragItem.getAttribute('data-tool'))
        {
            case 'start':
            {
                for(let i in elements)
                    if(elements[i].type == 'start')
                        return;
                addRectToBoard('start', foreground, background);
                break;
            }
            default:
                addRectToBoard(currentDragItem.getAttribute('data-tool'), foreground, background);
                break;
        }
    });
});