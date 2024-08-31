const db = require('../db');
const fs = require('fs');
const randomstring = require('randomstring');
const path = require('path');

module.exports = {
  createBlock: async (data) => {
    try {
      const block = await db.block.create(data);
      const botSchema = await db.botSchema.findById(data.botSchema);
      if (botSchema) {
        botSchema.updated = Date.now();
        await botSchema.save();
      }
      return block._id;
    } catch (err) {
      throw err;
    }
  },

  deleteBlock: async (id) => {
    try {
      await db.block.deleteOne({ _id: id });
      return true;
    } catch (err) {
      throw err;
    }
  },

  changeBlockPosition: async ({ id, x, y }) => {
    try {
      const block = await db.block.findById(id);
      if (!block) throw new Error("Block not found");
      block.position_x = x;
      block.position_y = y;
      await block.save();

      const botSchema = await db.botSchema.findById(block.botSchema);
      if (botSchema) {
        botSchema.updated = Date.now();
        await botSchema.save();
      }
      return true;
    } catch (err) {
      throw err;
    }
  },

  changeBlockAction: async ({ id, action }) => {
    try {
      const block = await db.block.findById(id);
      if (!block) throw new Error("Block not found");
      block.action = JSON.stringify(action);
      await block.save();

      const botSchema = await db.botSchema.findById(block.botSchema);
      if (botSchema) {
        botSchema.updated = Date.now();
        await botSchema.save();
      }
      return true;
    } catch (err) {
      throw err;
    }
  },

  getBlockAction: async (id) => {
    try {
      const block = await db.block.findById(id);
      if (!block) throw new Error("Block not found");
      return JSON.parse(block.action);
    } catch (err) {
      throw err;
    }
  },

  uploadPhoto: async (data) => {
    try {
      const [info, ...rest] = data.split(',');
      const buf = Buffer.from(rest.join(','), 'base64');
      const extension = info.substring("data:image/".length, info.indexOf(";base64"));
      const name = randomstring.generate();
      fs.writeFileSync(path.resolve(`public/images/${name}.${extension}`), buf);
      return `${name}.${extension}`;
    } catch (err) {
      throw err;
    }
  },

  addConnection: async ({ parent, child }) => {
    try {
      const p = await db.block.findById(parent);
      const c = await db.block.findById(child);

      if (!p || !c) throw new Error("Block not found");

      if (!p.children.includes(c._id)) {
        p.children.push(c._id);
        await p.save();

        const botSchema = await db.botSchema.findById(c.botSchema);
        if (botSchema) {
          botSchema.updated = Date.now();
          await botSchema.save();
        }
        return true;
      } else {
        return false;
      }
    } catch (err) {
      throw err;
    }
  },

  connectionDelete: async ({ parent, child }) => {
    try {
      const p = await db.block.findById(parent);
      if (!p) throw new Error("Parent block not found");

      const childIndex = p.children.indexOf(child);
      if (childIndex !== -1) {
        p.children.splice(childIndex, 1);
        await p.save();

        const botSchema = await db.botSchema.findById(p.botSchema);
        if (botSchema) {
          botSchema.updated = Date.now();
          await botSchema.save();
        }
      }
      return true;
    } catch (err) {
      throw err;
    }
  },

  getSchemas: async () => {
    try {
      const schemas = await db.botSchema.find({});
      return schemas;
    } catch (err) {
      throw err;
    }
  },

  loadSchema: async (id) => {
    try {
      const blocks = await db.block.find({ botSchema: id });
      return blocks;
    } catch (err) {
      throw err;
    }
  },

  newSchema: async (name) => {
    try {
      const schema = await db.botSchema.create({ name });
      return schema;
    } catch (err) {
      throw err;
    }
  }
};
