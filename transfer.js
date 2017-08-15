const db = require('./db');
const fs = require('fs');
const randomstring = require('randomstring');
const path = require('path');

let assoc = {},
  typeCounter = {};

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
  }
  return textContent + ' #' + Nr;
}

/*
{ uid: '7me3910otf41caknr',
  type: 'start',
  position: { x: 479, y: 21.000001907348633 },
  action: { text: 'СТАРТ', image: null },
  parents: [],
  children: [ '21mhve199pcs20h9ge' ] }
*/

db.botSchema.findOne({name: 'Экспедиция доктора Ниврада'}, async (err, s) => {
  let graph =  require('./backup_Экспедиция доктора Ниврада.json');
  for(let g of graph) {
    if(!('action' in g) || g.action === null) {
      g.action = {
        text: null,
        image: null
      };
    }
    // if(g.action.image) {
    //   let parts = g.action.photo.split(',');
    //   let info = parts.shift();
    //   let data = parts.join(',');
    //   let buf = Buffer.from(data, 'base64');
    //   let extension = info.substring("data:image/".length, info.indexOf(";base64"));
    //   let name = randomstring.generate();
    //   fs.writeFileSync(path.resolve('public/images/' + name + '.' + extension), buf);
    //   g.action.image = name + '.' + extension;
    // }
    let name = getBlockName(g.type);
    let block = await db.block.create({
      botSchema: s._id,
      name: name,
      type: g.type,
      position_x: Math.round(g.position.x),
      position_y: Math.round(g.position.y),
      action: JSON.stringify(g.action)
    });
    assoc[g.uid] = block._id;
  }
  for(let g of graph) {
    if(g.children.length > 0) {
      let block = await db.block.findOne({_id: assoc[g.uid]});
      for(let c of g.children) {
        block.children.push(assoc[c]);
      }
      block.save();
    }
  }
});