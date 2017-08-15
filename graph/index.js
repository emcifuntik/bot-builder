const db = require('../db');

module.exports = class Graph {
    constructor(id)
    {
        this.id = id;
    }

    async getVertice(id)
    {
        let block = await db.block.findOne({_id: id, botSchema: this.id});
        return block;
    }

    async getStart()
    {
        console.log(this.id.toString());
        let start = await db.block.findOne({botSchema: this.id, type: 'start'});
        return start;
    }

};
