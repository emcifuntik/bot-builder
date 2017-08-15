const db = require('../db');
const fs = require('fs');
const randomstring = require('randomstring');
const path = require('path');

module.exports = {
  createBlock: (data) => {
    return new Promise((resolve, reject) => {
      db.block.create(data, (err, block) => {
        if(err)
          return reject(err);
        db.botSchema.findOne({_id: data.botSchema},(err, botSchema) => {
          if(err)
            return reject(err);
          botSchema.updated = Date.now();
          botSchema.save();
          resolve(block._id);
        });
      });
    });
  },
  deleteBlock: (id) => {
    return new Promise((resolve, reject) => {
      db.block.findOne({_id: id}).remove().exec((err, block) => {
        if(err)
          return reject(err);
        resolve(true);
      });
    });
  },
  changeBlockPosition: ({id, x, y}) => {
    return new Promise((resolve, reject) => {
      db.block.findOne({_id: id}, (err, block) => {
        if(err)
          return reject(err);
        block.position_x = x;
        block.position_y = y;
        block.save();
        db.botSchema.findOne({_id: block.botSchema},(err, botSchema) => {
          if(err)
            return reject(err);
          botSchema.updated = Date.now();
          botSchema.save();
        });
        resolve(true);
      });
    });
  },
  changeBlockAction: ({id, action}) => {
    return new Promise((resolve, reject) => {
      db.block.findOne({_id: id}, (err, block) => {
        if(err)
          return reject(err);
        block.action = JSON.stringify(action);
        block.save();
        db.botSchema.findOne({_id: block.botSchema},(err, botSchema) => {
          if(err)
            return reject(err);
          botSchema.updated = Date.now();
          botSchema.save();
        });
        resolve(true);
      });
    });
  },
  getBlockAction: (id) => {
    return new Promise((resolve, reject) => {
      db.block.findOne({_id: id}, (err, block) => {
        if(err)
          return reject(err);
        if(!block)
          return reject(null);
        resolve(JSON.parse(block.action));
      });
    });
  },
  uploadPhoto: (data) => {
    return new Promise((resolve, reject) => {
      let parts = data.split(',');
      let info = parts.shift();
      data = parts.join(',');
      let buf = Buffer.from(data, 'base64');
      let extension = info.substring("data:image/".length, info.indexOf(";base64"));
      let name = randomstring.generate();
      fs.writeFileSync(path.resolve('public/images/' + name + '.' + extension), buf);
      resolve(name + '.' + extension);
    });
  },
  addConnection: ({parent, child}) => {
    return new Promise((resolve, reject) => {
      db.block.findOne({_id: parent}, (err, p) => {
        if(err)
          return reject(err);
        db.block.findOne({_id: child}, (err, c) => {
          if(err)
            return reject(err);
          if(p.children.indexOf(c._id) === -1) {
            p.children.push(c._id);
            p.save();
            db.botSchema.findOne({_id: c.botSchema},(err, botSchema) => {
              if(err)
                return reject(err);
              botSchema.updated = Date.now();
              botSchema.save();
            });
            resolve(true);
          }
          else {
            resolve(false);
          }
        });
      });
    });
  },
  connectionDelete: ({parent, child}) => {
    return new Promise((resolve, reject) => {
      db.block.findOne({_id: parent}, (err, p) => {
        if(err)
          return reject(err);
        if(p.children.indexOf(child) !== -1) {
          p.children.splice(p.children.indexOf(child), 1);
          p.save();
          db.botSchema.findOne({_id: p.botSchema},(err, botSchema) => {
            if(err)
              return reject(err);
            botSchema.updated = Date.now();
            botSchema.save();
          });
        }
        resolve(true);
      });
    });
  },
  getSchemas: () => {
    return new Promise((resolve, reject) => {
      db.botSchema.find({}, (err, schemas) => {
        if(err)
          return reject(err);
        resolve(schemas);
      });
    });
  },
  loadSchema: (id) => {
    return new Promise((resolve, reject) => {
      db.block.find({botSchema: id}, (err, blocks) => {
        if(err)
          return reject(err);
        resolve(blocks);
      });
    });
  },
  newSchema: (name) => {
    return new Promise((resolve, reject) => {
      db.botSchema.create({
        name
      }, (err, schema) => {
        if(err)
          return reject(err);
        resolve(schema);
      });
    });
  }
}