const express = require('express');
const router = express.Router();
const db = require('../db/index');

/* GET home page. */
router.get('/direct', function(req, res, next) {
    if(!req.user)
        return res.redirect('/login');
    res.render('editorDirect', { title: 'Bot Editor' });
});

router.get('/graphs', function(req, res, next) {
    if(!req.user)
        return res.redirect('/login');
    db.botSchema.find((err, graphs) => {
        let names = graphs.map((value) => {
            return value.name;
        });
        console.log(names);
        res.json(names);
    });
});

router.post('/open', function(req, res, next) {
    if(!req.user)
        return res.redirect('/login');
    console.log(req.body.name);
    db.botSchema.findOne({
        name: req.body.name
    }, (err, graph) => {
        if(err)
            return res.json(err);
        res.json(graph);
    });
});

router.post('/exist', function(req, res, next) {
    if(!req.user)
        return res.redirect('/login');
    if(req.body.name)
    {
        db.botSchema.findOne({name: req.body.name}, (err, botGraph) => {
            res.json({result: (botGraph != null)});
        });
    }
});

router.post('/save', function(req, res, next) {
    if(!req.user)
        return res.redirect('/login');
    if(req.body.name && req.body.graph)
    {
        db.botSchema.findOne({name: req.body.name}, (err, botGraph) => {
            if(botGraph == null)
            {
                db.botSchema.create({
                    name: req.body.name,
                    graph: req.body.graph
                }, (err, botGraph) => {
                    if(!err)
                        res.json({result: true});
                    else
                        res.json({result: false});
                });
            }
            else
            {
                botGraph.graph = req.body.graph;
                botGraph.updated = Date.now();
                botGraph.save();
                res.json({result: true});
            }
        });
    }
    else
        res.json({result: false});
});

router.get('/', function(req, res, next) {
    if(!req.user)
        return res.redirect('/login');
    res.render('editor', { title: 'Bot Editor', user: req.user });
});

module.exports = router;
