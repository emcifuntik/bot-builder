window.__blocks = {};

class Block {
  constructor(name, type, id) {
    this.name = name;
    this.type = type;
    this.position = {
      x: 0,
      y: 0
    };
    this.children = [];
    this.action = {};
    this.id = id;
    window.__blocks[this.id] = this;
  }

  static get(id) {
    if(id in window.__blocks) 
      return window.__blocks[id];
    else
      null;
  }

  static clear() {
    window.__blocks = {};
  }

  static countOfType(type) {
    let count = 0;
    for(let b in window.__blocks) {
      if(window.__blocks[b].type === type)
        count++;
    }
    return count;
  }

  static delete(id) {
    if(id in window.__blocks)
      delete window.__blocks[id];
  }

  addChild(child) {
    if(this.children.indexOf(child.id) === -1) {
      this.children.push(child.id);
    }
    else
      throw new ExceptionInformation('Child already exists');
  }

  removeChild(child) {

  }
}