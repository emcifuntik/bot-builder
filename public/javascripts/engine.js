let dateOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
};

let selectorClicked = false,
  selectorOpened = false,
  connection = {
    parent: null,
    child: null
  },
  rightClicked = false,
  schema = null,
  deleteFunction = null,
  currentEdit = null;

window.addEventListener('mousedown', (event) => {
  if(!selectorClicked && selectorOpened) {
    selectorOpened = false;
    dom.id.schemaSelector.style.display = 'none';
  }
});
window.addEventListener('mouseup', (event) => {
  selectorClicked = false;
});
window.addEventListener('load', () => {
  dom.id.schemaSelector.addEventListener('mousedown', (event) => {
    selectorClicked = true;
  });
  dom.id.modalСlose.addEventListener('click', modalClose);
  dom.id.modalDelete.addEventListener('click', modalDelete);
  dom.id.modalSave.addEventListener('click', modalSave);
  dom.id.messageImage.addEventListener('change', imageUpload);
  dom.id.preloader.style.display = 'none';
})

function menuClick(event, action)
{
  switch(action){
    case 'new':
    {
      let name = prompt('Введите имя новой схемы', 'Новая схема#' + (Math.round(Math.random()*100000000).toString(16).substr(0, 4)));
      if(name != null) {
        RPC.newSchema(name).then((result) => {
          foreground.innerHTML = '';
          background.innerHTML = '';
          Block.clear();
          schema = result;
          boardViewBox[0] = 0;
          boardViewBox[1] = 0;
          boardViewBox[2] = right.clientWidth;
          boardViewBox[3] = right.clientHeight;
          board.setAttribute("viewBox", boardViewBox.join());
        }).catch(console.error);
      }
      break;
    }
    case 'open':
    {
      RPC.getSchemas().then((schemas) => {
        dom.id.schemaSelector.innerHTML = '';
        for(let schema of schemas) {
          let section = document.createElement('section');
          section.addEventListener('click', () => {
            loadSchema(schema._id);
            dom.id.schemaSelector.style.display = 'none';
          });
          let schemaNameSection = document.createElement('section');
          schemaNameSection.innerHTML = schema.name;
          let schemaUpdateSection = document.createElement('section');
          let date = new Date(schema.updated);
          schemaUpdateSection.innerHTML = date.toLocaleString("ru", dateOptions);
          section.appendChild(schemaNameSection);
          section.appendChild(schemaUpdateSection);
          dom.id.schemaSelector.appendChild(section);
        }

        dom.id.schemaSelector.style.display = 'flex';
        dom.id.schemaSelector.style.left = event.clientX + 'px';
        dom.id.schemaSelector.style.top = event.clientY + 'px';
        selectorOpened = true;
      }).catch(console.error);
      break;
    }
  }
}

function loadSchema(id) {
  dom.id.preloader.style.display = 'flex';
  RPC.loadSchema(id).then((blocks) => {
    schema = id;
    foreground.innerHTML = '';
    background.innerHTML = '';
    Block.clear();
    boardViewBox[0] = 0;
    boardViewBox[1] = 0;
    boardViewBox[2] = right.clientWidth;
    boardViewBox[3] = right.clientHeight;
    board.setAttribute("viewBox", boardViewBox.join());

    clearElements();
    for(let block of blocks) {
      loadBlock(block.name, block._id, block.position_x, block.position_y, block.children, block.type);
      let b = new Block(block.name, block.type, block._id);
      b.action = JSON.parse(block.action);
    }
    loadConnections();
    dom.id.preloader.style.display = 'none';
  }).catch((err) => {
    console.error(err);
    dom.id.preloader.style.display = 'none';
  });
}

function imageUpload(e) {
  let file = e.target.files[0];
  let reader  = new FileReader();
  reader.onloadend = function () {
    dom.id.messageImagePreview.src = reader.result;
    RPC.uploadPhoto(reader.result).then((imageName) => {
      dom.id.messageImageUrl.value = imageName;
    }).catch((err) => {
      console.error(err);
    })
  };

  if (file) {
    reader.readAsDataURL(file); //reads the data as a URL
  } else {
    dom.id.messageImagePreview.src = '';
  }
}

function modalClose() {
  dom.id.modal.style.display = 'none';
}

function modalDelete() {
  if(deleteFunction)
    deleteFunction(true);
  dom.id.modal.style.display = 'none';
}

function modalSave() {
  dom.id.preloader.style.display = 'flex';
  console.log(currentEdit.type);
  if(currentEdit.type == 'pay')
  {
    currentEdit.action = {
      text: dom.id.messageText.value,
      image: dom.id.messageImageUrl.value,
      paymentId: dom.id.payId.value,
      paymentValue: dom.id.payValue.value,
      delay: dom.id.delayValue.value
    };
  }
  else if(currentEdit.type == 'textinput') {
    currentEdit.action = {
      text: dom.id.messageText.value,
      image: dom.id.messageImageUrl.value,
      varname: dom.id.varName.value,
      delay: dom.id.delayValue.value
    };
  }
  else if(currentEdit.type == 'sendmail') {
    currentEdit.action = {
      text: dom.id.messageText.value,
      subject: dom.id.emailSubject.value,
      recipient: dom.id.emailAddress.value
    };
  }
  else if(currentEdit.type == 'math') {
    currentEdit.action = {
      varName: dom.id.mathName.value,
      operation: dom.id.mathOperation.value,
      value: dom.id.mathValue.value
    };
  }
  else if(currentEdit.type == 'condition') {
    currentEdit.action = {
      varName: dom.id.triggerName.value,
      event: dom.id.triggerEvent.value,
      value: dom.id.triggerValue.value
    };
  }
  else
  {
    currentEdit.action = {
      text: dom.id.messageText.value,
      image: dom.id.messageImageUrl.value,
      delay: dom.id.delayValue.value
    };
  }
  RPC.changeBlockAction({id: currentEdit.id, action: currentEdit.action}).then((result) => {
    dom.id.preloader.style.display = 'none';
  }).catch((err) => {
    console.error(err);
    dom.id.preloader.style.display = 'none';
  })
  dom.id.modal.style.display = 'none';
}

Renderer.onbeforeblockadd = (type, cb) => {
  if(schema === null) {
    alert('Схема не загружена');
  }
  else {
    if(type === 'start' && Block.countOfType(type) > 0) {
      alert('Старт может быть только один');
    }
    else
      cb();
  }
};

Renderer.onblockadd = (info, cb) => {
  RPC.createBlock({
    botSchema: schema,
    name: info.name, 
    type: info.type,
    position_x: info.position.x,
    position_y: info.position.y,
    action: '{}'
  }).then((id) => {
    new Block(info.name, info.type, id);
    cb(id);
  }).catch((err) => {
    console.error(err);
  })
};

Renderer.onblockdelete = (id) => {
  RPC.deleteBlock(id);
};

Renderer.ontooltip = (id, cb) => {
  let block = Block.get(id);
  if(block.action != null && 'text' in block.action && block.action.text.length > 0)
    cb(block.action.text);
}

Renderer.onconnection = (parent, child, cb) => {
  if(Block.get(parent).type == 'question' && Block.get(child).type != 'answer') {
    alert('Вопрос может быть соединён только с ответом');
    return;
  }
  if(Block.get(parent).type == 'final') {
    alert('Финал является последним блоком и его нельзя ни с чем соединить');
    return;
  }
  if(Block.get(parent).type == 'condition' && Block.get(parent).children.length >= 2) {
    alert('У этого условия уже есть два исхода');
    return;
  }
  RPC.addConnection({parent, child}).then((result) => {
    if(result) {
      if(Block.get(parent).type == 'condition'){
        if(Block.get(parent).children.length == 0)
          cb('#0000AA');
        if(Block.get(parent).children.length == 1)
          cb('#AA0000');
      }
      else
        cb();
      Block.get(parent).addChild(Block.get(child));
    }
  }).catch(console.error);
};

Renderer.onconnectiondelete = (parent, child) => {
  RPC.connectionDelete({parent, child}).catch(console.error);
};

Renderer.onblockmoving = (id, x, y, cb) => {
  cb();
};

Renderer.onblockmoved = (id, x, y) => {
  RPC.changeBlockPosition({id, x, y}).catch(console.error);
};

Renderer.ondblclick = (id, cb) => {
  dom.id.preloader.style.display = 'flex';
  RPC.getBlockAction(id).then((action) => {
    currentEdit = Block.get(id);
    dom.id.modal.style.display = 'flex';
    dom.id.preloader.style.display = 'none';
    Block.get(id).action = action;

    dom.id.messageImage.style.display = 'block';
    dom.id.messageImagePreview.style.display = 'block';
    dom.id.messageText.style.display = 'block';
    dom.id.delayValue.style.display = 'block';
    dom.id.imageLabel.style.display = 'block';
    dom.id.messageLabel.style.display = 'block';
    dom.id.delayLabel.style.display = 'block';

    if('text' in action && action.text.length > 0) {
      dom.id.messageText.value = action.text;
    }
    else {
      dom.id.messageText.value = '';
    }

    if('delay' in action && action.delay.length > 0) {
      dom.id.delayValue.value = action.delay;
    }
    else {
      dom.id.delayValue.value = '0';
    }

    if('image' in action && action.image != null && action.image.length > 0) {
      dom.id.messageImageUrl.value = action.image;
      dom.id.messageImagePreview.src = '/images/' + action.image;
    }
    else {
      dom.id.messageImageUrl.value = '';
      dom.id.messageImagePreview.src = '';
    }

    if(currentEdit.type == 'textinput') {
      dom.id.modalContentTextInput.style.display = 'block';
      if('varname' in action && action.varname.length > 0) {
        dom.id.varName.value = action.varname;
      }
      else {
        dom.id.varName.value = '';
      }
    }
    else {
      dom.id.modalContentTextInput.style.display = 'none';
    }

    if(currentEdit.type == 'math') {
      dom.id.modalContentMath.style.display = 'block';
      if('varName' in action && action.varName.length > 0) {
        dom.id.mathName.value = action.varName;
      }
      else {
        dom.id.mathName.value = '';
      }
      if('operation' in action && action.operation.length > 0) {
        dom.id.mathOperation.value = action.operation;
      }
      else {
        dom.id.mathOperation.value = '=';
      }
      if('value' in action && action.value.length > 0) {
        dom.id.mathValue.value = action.value;
      }
      else {
        dom.id.mathValue.value = '';
      }
      dom.id.messageText.style.display = 'none';
      dom.id.messageImage.style.display = 'none';
      dom.id.messageImagePreview.style.display = 'none';
      dom.id.imageLabel.style.display = 'none';
      dom.id.messageLabel.style.display = 'none';
      dom.id.delayLabel.style.display = 'none';
      dom.id.delayValue.style.display = 'none';
    }
    else {
      dom.id.modalContentMath.style.display = 'none';
    }

    if(currentEdit.type == 'condition') {
      dom.id.modalContentTrigger.style.display = 'block';
      if('varName' in action && action.varName.length > 0) {
        dom.id.triggerName.value = action.varName;
      }
      else {
        dom.id.triggerName.value = '';
      }
      if('event' in action && action.event.length > 0) {
        dom.id.triggerEvent.value = action.event;
      }
      else {
        dom.id.triggerEvent.value = '==';
      }
      if('value' in action && action.value.length > 0) {
        dom.id.triggerValue.value = action.value;
      }
      else {
        dom.id.triggerValue.value = '';
      }
      dom.id.messageText.style.display = 'none';
      dom.id.messageImage.style.display = 'none';
      dom.id.messageImagePreview.style.display = 'none';
      dom.id.imageLabel.style.display = 'none';
      dom.id.messageLabel.style.display = 'none';
      dom.id.delayLabel.style.display = 'none';
      dom.id.delayValue.style.display = 'none';
    }
    else {
      dom.id.modalContentTrigger.style.display = 'none';
    }
    
    if(currentEdit.type == 'sendmail') {
      dom.id.modalContentEmail.style.display = 'block';
      if('subject' in action && action.subject.length > 0) {
        dom.id.emailSubject.value = action.subject;
      }
      else {
        dom.id.emailSubject.value = '';
      }
      if('recipient' in action && action.recipient.length > 0) {
        dom.id.emailAddress.value = action.recipient;
      }
      else {
        dom.id.emailAddress.value = '';
      }
      dom.id.messageImage.style.display = 'none';
      dom.id.messageImagePreview.style.display = 'none';
      dom.id.imageLabel.style.display = 'none';
    }
    else {
      dom.id.modalContentEmail.style.display = 'none';
    }

    if(currentEdit.type == 'pay') {
      dom.id.modalContentPay.style.display = 'flex';
      if('paymentId' in action) {
        dom.id.payId.value = action.paymentId;
      }
      else {
        dom.id.payId.value = '';
      }
      if('paymentValue' in action) {
        dom.id.payValue.value = action.paymentValue;
      }
      else {
        dom.id.payValue.value = '';
      }
    }
    else {
      dom.id.modalContentPay.style.display = 'none';
    }
    dom.id.messageImage.value = '';
  }).catch((err) => {
    console.error(err);
    dom.id.preloader.style.display = 'none';
  })
  deleteFunction = cb;
};
